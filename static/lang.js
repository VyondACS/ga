const get = require("../req/get");
const env = require("../env");
const fs = require("fs");

module.exports = function (req, res) {
  if (req.method != "GET") return;
  const match = req.url.match(/\/static\/client_theme\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (!match) return;
  const type = match[1];
  const stuff = match[2];
  const id = match[3];
  get(`https://josephanimate2021.github.io/static/477/client_theme/${type}/${stuff}/${id}`).then(b => res.end(b)).catch(e => {
    console.log(e); 
    res.end('404 Not Found'); 
  });
  return true;
}
