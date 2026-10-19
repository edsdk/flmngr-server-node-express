/**
 *
 * Flmngr server package for Node (Express).
 *
 * This file is a part of the server side implementation of Flmngr -
 * the JavaScript/TypeScript file manager widely used for building apps and editors.
 *
 * Comes as a standalone package for custom integrations,
 * and as a part of N1ED web content builder.
 *
 * Flmngr file manager:       https://flmngr.com
 * N1ED web content builder:  https://n1ed.com
 * Developer website:         https://edsdk.com
 *
 * License: GNU General Public License Version 3 or later
 *
 **/

import * as fs from "node:fs";
import type {Readable} from "node:stream";
import express from "express";
import type {Request, Response} from "express";
import cors from "cors";
import {FlmngrServer} from "@edsdk/flmngr-server-node";
import type {FlmngrConfig, FlmngrHeaders, FlmngrResponseBody} from "@edsdk/flmngr-server-node";

import type {FlmngrExpressConfig} from "./FlmngrExpressConfig.js";
import {ExpressRequest} from "./ExpressRequest.js";
import {readRequest} from "./readRequest.js";

export type {FlmngrExpressConfig, FlmngrExpressConfigBase} from "./FlmngrExpressConfig.js";
export {ExpressRequest} from "./ExpressRequest.js";
export {readRequest} from "./readRequest.js";
export type {ReadRequestOptions, ReadRequestResult} from "./readRequest.js";

const SERVER_ERROR_TEXT = "An error occurred on the server side. Please check server logs.";

// Serves the file manager on config.urlFileManager and, if config.urlFiles is set, the storage
// directory on that URL. The same URL answers POST (every request of the file manager) and GET
// (previews requested as plain image URLs).
export function bindFlmngr(config: FlmngrExpressConfig): void {

  const app = config.app;
  const logError = config.onLogError || ((message: string) => console.error(message));
  const maxUploadSize = FlmngrServer.parseSize(config.maxUploadSize);

  if (config.cors !== false) {
    app.use(config.urlFileManager, cors(config.cors === true || config.cors === undefined ? undefined : config.cors));
  }

  if (!!config.urlFiles) {
    // Serve static files uploaded to the storage; the cache dir and other dot entries stay private
    app.use(
      config.urlFiles,
      express.static(config.dirFiles, {dotfiles: "ignore"})
    );
  }

  const handler = async (req: Request, res: Response): Promise<void> => {
    let tmpFiles: string[] = [];
    try {
      const read = await readRequest(req, {dirTmp: config.dirTmp, maxUploadSize});
      tmpFiles = read.tmpFiles;

      // One config per request: nothing of this request is shared with the next one
      const requestConfig: FlmngrConfig = {
        dirFiles: config.dirFiles,
        dirCache: config.dirCache,
        dirTmp: config.dirTmp,
        dirPermissions: config.dirPermissions,
        denyFilePatterns: config.denyFilePatterns,
        doUpscalePreviews: config.doUpscalePreviews,
        maxUploadSize: config.maxUploadSize,
        messageExceptionLogger: config.messageExceptionLogger,
        onLogError: logError,
        request: new ExpressRequest(req.method, read.query, read.body, read.files, read.contentLength),
      };

      await FlmngrServer.flmngrRequest(
        requestConfig,
        {
          onFinish: (httpStatusCode: number, headers: FlmngrHeaders, response: FlmngrResponseBody) => {
            send(res, httpStatusCode, headers, response, logError);
          },
          onLogError: logError,
        },
        config.overrideFramework || "express"
      );
    } catch (e) {
      logError("Flmngr: " + ((e as Error)?.stack || e));
      if (!res.headersSent) {
        res.status(500).type("text/plain").send(SERVER_ERROR_TEXT);
      }
    } finally {
      for (const tmp of tmpFiles) {
        if (fs.existsSync(tmp)) {
          try {
            fs.unlinkSync(tmp);
          } catch (e) {
            // the system cleans its temp dir
          }
        }
      }
    }
  };

  // Every method reaches the library: POST and GET do the work, anything else gets an empty answer
  app.all(config.urlFileManager, handler);
}

function send(res: Response, httpStatusCode: number, headers: FlmngrHeaders, response: FlmngrResponseBody, logError: (message: string) => void): void {
  if (res.headersSent) {
    return;
  }
  for (const headerName in headers) {
    res.setHeader(headerName, headers[headerName]);
  }
  res.status(httpStatusCode);

  if (typeof response === "string") {
    res.send(response);
  } else if (response !== null && typeof (response as Readable).pipe === "function") {
    const stream = response as Readable;
    stream.on("error", (e: Error) => {
      logError("Flmngr: unable to send the file: " + e.message);
      if (!res.headersSent) {
        res.status(500);
      }
      res.end();
    });
    stream.pipe(res);
  } else {
    res.json(response);
  }
}
