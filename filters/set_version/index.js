const verStr = process.env.RELEASE_VERSION;
const ver = verStr
  .slice(1)
  .split(".")
  .map((v) => parseInt(v));

const fs = require("fs");

function handleManifest(path) {
  const contentStr = fs.readFileSync(`${path}/manifest.json`).toString();
  const content = JSON.parse(contentStr);
  content.header.version = ver;
  fs.writeFileSync(`${path}/manifest.json`, JSON.stringify(content));
}

handleManifest("BP");
handleManifest("RP");
