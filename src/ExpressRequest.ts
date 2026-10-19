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
import type {FlmngrRequest, PhpArray, PhpValue, UploadedFile} from "@edsdk/flmngr-server-node";

// One request, read once: the method, the query, the body fields and the uploaded files
export class ExpressRequest implements FlmngrRequest {

  constructor(
    protected method: string,
    protected query: PhpArray,
    protected body: PhpArray,
    protected files: { [field: string]: UploadedFile },
    protected contentLength: number | null,
  ) {}

  getMethod(): string {
    return this.method;
  }

  getPost(): PhpArray {
    return this.body;
  }

  getGet(): PhpArray {
    return this.query;
  }

  getFiles(): { [field: string]: UploadedFile } {
    return this.files;
  }

  getContentLength(): number | null {
    return this.contentLength;
  }

  getParameterNumber(name: string, defaultValue?: number): number {
    const strValue = this.getParameterString(name, undefined);

    let isCorrectNumber = true;
    if (strValue !== undefined && strValue !== null) {
      isCorrectNumber = "" + parseInt(strValue, 10) === strValue;
    } else {
      isCorrectNumber = false;
    }

    if (isCorrectNumber) {
      return parseInt(strValue as string, 10);
    } else {
      return defaultValue as number;
    }
  }

  getParameterString(name: string, defaultValue?: string): string {
    const value = this.value(name);
    if (typeof value === "string") { // may be a list
      return value;
    } else {
      return defaultValue as string;
    }
  }

  getParameterStringArray(name: string, defaultValue?: string[]): string[] {
    let value = this.value(name);
    if (typeof value === "string") {
      value = [value];
    }
    if (Array.isArray(value)) {
      return value.map((v) => "" + v);
    } else {
      return defaultValue as string[];
    }
  }

  getParameterFile(name: string): { data: Buffer; fileName: string } | null {
    const file = this.files[name];
    if (!file || file.tmp_name === "") {
      return null;
    }
    return {
      data: fs.readFileSync(file.tmp_name),
      fileName: file.name,
    };
  }

  private value(name: string): PhpValue | undefined {
    const fromBody = this.body[name];
    return fromBody !== undefined ? fromBody : this.query[name];
  }

}
