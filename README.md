[![Flmngr file manager logo](https://flmngr.com/img/logo/64px/Flmngr.png)](https://flmngr.com)

# Flmngr Node backend for Express

> Server-side part of the Flmngr file manager, as a module for Express apps

[![Flmngr file manager screenshot](https://flmngr.com/img/browsing.jpg)](https://flmngr.com)

[Flmngr file manager](https://flmngr.com) is used to upload and manage files and images. Can be a standalone file manager (React/Angular/etc. or custom JavaScript or TypeScript integrations) or work together with [TinyMCE](https://flmngr.com/doc/install-tinymce-plugin), [CKEditor&nbsp;4](https://flmngr.com/doc/install-ckeditor-plugin), [CKEditor&nbsp;5](https://flmngr.com/doc/install-ckeditor-5-plugin), [N1ED](https://n1ed.com), or any other JS components.

This module binds the Flmngr backend (the [`@edsdk/flmngr-server-node`](https://www.npmjs.com/package/@edsdk/flmngr-server-node) library) to a URL of your Express 4 or 5 app, and optionally serves the storage directory too.

## Install

Node.js 18.17 or newer. In the directory of your project:

```
npm i @edsdk/flmngr-server-node-express --save
```

## Usage

```js
import express from "express";
import {bindFlmngr} from "@edsdk/flmngr-server-node-express";

const app = express();

bindFlmngr({
    app: app,
    urlFileManager: "/flmngr",   // the URL the file manager talks to
    urlFiles: "/files/",         // optional: serve the storage here (or let Nginx do it)
    dirFiles: "./files"          // the storage directory
});

app.listen(3000, "127.0.0.1");
```

Every option of the library is accepted too (`dirCache`, `dirTmp`, `dirPermissions`, `denyFilePatterns`, `doUpscalePreviews`, `maxUploadSize`, `onLogError`). The module answers CORS preflights on the file manager URL for any origin; pass `cors: false` to leave that to a proxy, or the options of the `cors` package to restrict it.

The full manual: [Install Flmngr into an Express app](https://flmngr.com/doc/install-file-manager-server-node-express). A ready-made app: [flmngr-server-node-express-example-ts](https://github.com/flmngr/flmngr-server-node-express-example-ts).

## See Also

- [Flmngr](https://flmngr.com) - Flmngr file manager.
- [Flmngr Node backends](https://flmngr.com/doc/install-file-manager-server-node) - the index of all Node packages.
- [Flmngr demos](https://codeplay.democdn.com/flmngr) - collection of JS samples on CodePlay.
- [Flmngr API](https://flmngr.com/doc/api) - API of Flmngr client.
- [N1ED](https://n1ed.com) - a website content builder with Flmngr file manager aboard, also works as a plugin for CKEditor 4, TinyMCE, which has modules for different CMSs.

## License

GNU General Public License v3 or later; see LICENSE.txt
