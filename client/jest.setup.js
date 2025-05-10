// Polyfill for TextEncoder/TextDecoder in Node test env
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
