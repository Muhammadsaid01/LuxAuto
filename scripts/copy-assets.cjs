const fs = require("node:fs");
for (const name of ["views", "public"]) fs.cpSync(`src/${name}`, `dist/${name}`, { recursive: true });
