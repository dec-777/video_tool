const { TextDecoder } = require("util");

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const gbkDecoder = new TextDecoder("gbk");

function decodeProcessOutput(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

  try {
    return utf8Decoder.decode(buffer);
  } catch {
    return gbkDecoder.decode(buffer);
  }
}

module.exports = {
  decodeProcessOutput
};
