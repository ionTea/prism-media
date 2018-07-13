const { Transform } = require('stream');

// super duper WIP

const STREAM_STRUCTURE_VERSION = 0;

const charCode = x => x.charCodeAt(0);
const OGGS_HEADER = Buffer.from([...'OggS'].map(charCode));
const OPUS_HEAD = Buffer.from([...'OpusHead'].map(charCode));

/**
* Demuxes an Ogg stream (containing Opus audio) to output an Opus stream.
* @extends {TransformStream}
*/
class OggOpusMuxer extends Transform {
  /**
  * Creates a new OggOpus demuxer.
  * @param {Object} [options] options that you would pass to a regular Transform stream.
  */
  constructor(options = {}) {
    super(Object.assign({ writableObjectMode: true }, options));
    this._page = [[OPUS_HEAD, 1]];
  }

  _writePage() {
    let output = Buffer.alloc(this._pageSize);
    // write the header
    OGGS_HEADER.copy(output);
    output.writeUInt8(STREAM_STRUCTURE_VERSION, 4);
    // should be more here but its a WIP OK >:(

    output.writeUInt8(this._totalSegments, 26);

    let i = 26;
    for (const packet of this._page) {
      let size = packet[0].length;
      while (size >= 0) {
        i++;
        if (size >= 255) output.writeUInt8(255, i);
        else output.writeUInt8(size, i);
        size -= 255;
      }
    }
    i++;

    for (const packet of this._page) {
      let buffer = packet[0];
      buffer.copy(output, i);
      i += buffer.length;
    }

    this._page = [];
    this.push(output);
    return output;
  }

  get _pageSize() {
    let size = 27;
    for (const [packet, segments] of this._page) {
      size += segments + packet.length;
    }
    return size;
  }

  get _totalSegments() {
    return this._page.reduce((total, p) => total + p[1], 0);
  }

  _flush(cb) {
    this._writePage();
    cb();
  }

  _transform(chunk, encoding, done) {
    const segments = (chunk.length % 255 === 0 ? 1 : 0) + Math.ceil(chunk.length / 255);
    if (this._totalSegments + segments > 255) this._writePage();
    this._page.push([chunk, segments]);
    done();
  }
}

/**
* Emitted when the demuxer encounters the opus head.
* @event OggOpusDemuxer#head
* @param {Buffer} segment a buffer containing the opus head data.
*/

/**
* Emitted when the demuxer encounters opus tags.
* @event OggOpusDemuxer#tags
* @param {Buffer} segment a buffer containing the opus tags.
*/

module.exports = OggOpusMuxer;
