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
import * as os from "node:os";
import * as path from "node:path";
import {randomBytes} from "node:crypto";
import busboy from "busboy";
import type {Request} from "express";
import {PhpQuery} from "@edsdk/flmngr-server-node";
import type {PhpArray, UploadedFile} from "@edsdk/flmngr-server-node";

export interface ReadRequestOptions {
  // Where uploads are kept while the request runs
  dirTmp?: string;
  // The biggest upload accepted, in bytes; null for no limit
  maxUploadSize?: number | null;
}

export interface ReadRequestResult {
  query: PhpArray;
  body: PhpArray;
  files: { [field: string]: UploadedFile };
  contentLength: number | null;
  // Temporary files this request created; the caller removes what is left of them
  tmpFiles: string[];
}

// Reads the request the way the file manager sends it: the query string, an urlencoded body
// (almost every request) or a multipart body with the file to upload. Lists arrive as
// "name[]" keys and stay lists, a repeated plain key keeps its last value.
export function readRequest(req: Request, options: ReadRequestOptions = {}): Promise<ReadRequestResult> {
  const url = req.originalUrl || req.url || "";
  const qIndex = url.indexOf("?");
  const query = PhpQuery.parse(qIndex === -1 ? "" : url.substring(qIndex + 1));

  const lengthHeader = req.headers["content-length"];
  const contentLength = typeof lengthHeader === "string" && /^\d+$/.test(lengthHeader) ? parseInt(lengthHeader, 10) : null;

  const result: ReadRequestResult = {query, body: {}, files: {}, contentLength, tmpFiles: []};

  if (req.method === "GET" || req.method === "HEAD") {
    return Promise.resolve(result);
  }

  // Another middleware has already read the body (express.urlencoded, body-parser): take its
  // fields as they are
  if ((req as any)._body === true && req.body && typeof req.body === "object") {
    result.body = toPhpArray(req.body);
    return Promise.resolve(result);
  }

  const contentType = ("" + (req.headers["content-type"] || "")).toLowerCase();
  if (contentType.startsWith("multipart/form-data")) {
    return readMultipart(req, result, options);
  }
  return readUrlencoded(req, result, options);
}

function readUrlencoded(req: Request, result: ReadRequestResult, options: ReadRequestOptions): Promise<ReadRequestResult> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const limit = options.maxUploadSize ?? null;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      // Over the limit the body is read to the end and dropped: the library answers with
      // the size error from the Content-Length alone
      if (limit === null || size <= limit) {
        chunks.push(chunk);
      }
    });
    req.on("end", () => {
      if (limit === null || size <= limit) {
        result.body = PhpQuery.parse(Buffer.concat(chunks).toString("utf8"));
      }
      if (limit !== null && size > limit && result.contentLength === null) {
        result.contentLength = size;
      }
      resolve(result);
    });
    req.on("error", reject);
  });
}

function readMultipart(req: Request, result: ReadRequestResult, options: ReadRequestOptions): Promise<ReadRequestResult> {
  return new Promise((resolve, reject) => {
    const dirTmp = options.dirTmp || os.tmpdir();
    const limit = options.maxUploadSize ?? null;
    let bb: busboy.Busboy;
    try {
      bb = busboy({
        headers: req.headers,
        limits: limit === null ? {} : {fileSize: limit},
        // browsers put the raw UTF-8 bytes of a file name into filename="..."; busboy's default
        // (latin1) would turn 猫.png into mojibake, PHP's SAPI keeps the bytes as they are
        defParamCharset: "utf8",
      });
    } catch (e) {
      // not a multipart body after all
      resolve(result);
      return;
    }
    const pending: Promise<void>[] = [];
    let failed: Error | null = null;

    bb.on("field", (name: string, value: string) => {
      PhpQuery.add(result.body, name, value);
    });

    bb.on("file", (name: string, stream: NodeJS.ReadableStream & { truncated?: boolean }, info: { filename: string; mimeType: string }) => {
      const tmpPath = path.join(dirTmp, "flmngr-upload-" + randomBytes(8).toString("hex"));
      result.tmpFiles.push(tmpPath);
      const out = fs.createWriteStream(tmpPath);
      let size = 0;
      let truncated = false;
      stream.on("data", (chunk: Buffer) => {
        size += chunk.length;
      });
      stream.on("limit", () => {
        truncated = true;
      });
      pending.push(new Promise<void>((done) => {
        out.on("close", () => {
          // A file over the limit arrives with no temporary path, which the library reports as
          // a size problem; an empty file is stored like any other
          const rejected = truncated;
          if (rejected) {
            try {
              fs.unlinkSync(tmpPath);
            } catch (e) {
              // already gone
            }
          }
          result.files[name] = {
            // the client may send a path: only the name is kept
            name: path.posix.basename(("" + (info.filename || "")).replace(/\\/g, "/")),
            type: info.mimeType,
            tmp_name: rejected ? "" : tmpPath,
            size: size,
          };
          done();
        });
        out.on("error", (e) => {
          failed = e;
          done();
        });
      }));
      stream.pipe(out);
    });

    bb.on("error", (e: Error) => {
      failed = e;
    });

    bb.on("close", () => {
      Promise.all(pending).then(() => {
        if (failed) {
          reject(failed);
        } else {
          resolve(result);
        }
      });
    });

    req.pipe(bb);
  });
}

// What express.urlencoded() parsed, as the flat string/list values the library reads
function toPhpArray(body: any): PhpArray {
  const out: PhpArray = {};
  for (const key of Object.keys(body)) {
    const value = body[key];
    if (Array.isArray(value)) {
      out[key] = value.map((v) => (typeof v === "string" ? v : "" + v));
    } else if (value !== null && typeof value === "object") {
      out[key] = toPhpArray(value);
    } else {
      out[key] = "" + value;
    }
  }
  return out;
}
