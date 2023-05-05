import { decode } from 'emailjs-utf7';
import { NextFunction, Response } from 'express';
import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { extname, join } from 'path';
import { default as isValidFilename, default as validFilename } from 'valid-filename';
import { ICustomRequest } from '../../models';
import { fileInfo, getWopiMethods, updateFile } from '../../utils';
const { WOPI_SERVER: wopiServer } = process.env;

export async function putRelativeFile(req: ICustomRequest, res: Response, next: NextFunction): Promise<void> {
  if (!wopiServer) {
    res.sendStatus(500);

    return;
  }


  const isRelative = req.header('X-WOPI-RelativeTarget');
  const isSuggested = req.header('X-WOPI-SuggestedTarget');
  const overwriteHeader = req.header('X-WOPI-OverwriteRelativeTarget');
  const overwrite = (overwriteHeader && overwriteHeader.toLowerCase() === 'true') || false;

  if (!!isRelative === !!isSuggested) {
    res.sendStatus(400);

    return;
  }

  if (isSuggested) {
    const fileName = isSuggested.startsWith('.') ? fileInfo.info?.BaseFileName + isSuggested : isSuggested;
    const decodedFileName = decode(fileName);
    let newFileName = decodedFileName;
    const folderPath = join(process.cwd(), 'files');
    const files = await readdir(folderPath);
    let count = 1;

    while (files.includes(newFileName)) {
      newFileName = `v${count}.${decodedFileName}`;
      count++;
    }

    if (!validFilename(newFileName)) {
      res.sendStatus(400);

      return;
    }

    const filePath = join(folderPath, newFileName);

    await updateFile(filePath, req.rawBody ?? Buffer.from(''), true);

    const { actionUrl, hostViewUrl, hostEditUrl } = await getUrls(newFileName);

    res.json({
      Name: newFileName,
      Url: actionUrl.href,
      HostEditUrl: hostEditUrl.href,
      HostViewUrl: hostViewUrl.href,
    });

    return;
  } else if (isRelative) {
    const fileName = (isRelative ?? '').startsWith('.') ? fileInfo.info?.BaseFileName + isRelative : isRelative;
    const newFileName = decode(fileName);
    const folderPath = join(process.cwd(), 'files');
    const filePath = join(folderPath, newFileName);
    const exists = existsSync(filePath);
    const isLocked = Object.hasOwnProperty.call(fileInfo.lock, newFileName);

    if (!isValidFilename(newFileName)) {
      res.sendStatus(400);

      return;
    }

    if (isLocked) {
      res.setHeader('X-WOPI-Lock', fileInfo.lock[newFileName] || '').sendStatus(409);

      return;
    }

    if (overwrite || !exists) {
      const success = await updateFile(filePath, req.rawBody ?? Buffer.from(''), false);

      res.status(success ? 200 : 409);
    } else {
      res.sendStatus(409);

      return;
    }

    const { actionUrl, hostViewUrl, hostEditUrl } = await getUrls(newFileName);

    res.json({
      Name: newFileName,
      Url: actionUrl.href,
      HostEditUrl: hostEditUrl.href,
      HostViewUrl: hostViewUrl.href,
    });

    return;
  } else {
    res.sendStatus(400);

    return;
  }
}

async function getUrls(newFileName: string): Promise<{ actionUrl: URL; hostViewUrl: URL; hostEditUrl: URL }> {
  const actionUrl = new URL(`${wopiServer}/wopi/files/${newFileName}`);
  actionUrl.searchParams.append('access_token', 'myVerySecretToken');
  const urls = await getWopiMethods();
  const ext = extname(newFileName).replace('.', '');

  const viewActionUrl = Object.hasOwnProperty.call(urls, ext) ?
    urls[ext].filter((u: string[]) => u[0] === 'view')[0][1] :
    urls['docx'].filter((u: string[]) => u[0] === 'view')[0][1];

  const hostViewUrl = new URL(viewActionUrl);
  hostViewUrl.searchParams.append('embed', '1');
  hostViewUrl.searchParams.append('WOPISrc', actionUrl.href);

  const editActionUrl = Object.hasOwnProperty.call(urls, ext) ?
    urls[ext].filter((u: string[]) => u[0] === 'edit')[0][1] :
    urls['docx'].filter((u: string[]) => u[0] === 'edit')[0][1];

  const hostEditUrl = new URL(editActionUrl);
  hostEditUrl.searchParams.append('embed', '1');
  hostEditUrl.searchParams.append('WOPISrc', actionUrl.href);

  return { actionUrl, hostViewUrl, hostEditUrl };
}
