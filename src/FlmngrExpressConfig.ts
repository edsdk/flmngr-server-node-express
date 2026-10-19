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

import type {Express} from "express";
import type {CorsOptions} from "cors";
import type {FlmngrConfig} from "@edsdk/flmngr-server-node";

export interface FlmngrExpressConfigBase extends FlmngrConfig {

  // The URL the file manager talks to, like "/flmngr"
  urlFileManager: string;

  // The URL the files are served from, like "/files/". Optional: leave it out when another
  // server (Nginx) publishes the storage directory
  urlFiles?: string;

  // CORS headers on the file manager URL. On by default (any origin), false to leave them to
  // your proxy, or the options of the "cors" package to restrict them
  cors?: boolean | CorsOptions;

  overrideFramework?: string; // do not change this option in your custom integrations please
}

export interface FlmngrExpressConfig extends FlmngrExpressConfigBase {
  app: Express;
}
