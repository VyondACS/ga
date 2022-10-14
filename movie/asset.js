const get = require("../req/get");
const loadPost = require("../req/body");
const env = require("../env");
const fUtil = require("../fileUtil");
const fs = require("fs");
const formidable = require("formidable");

function toAttrString(data) {
	return typeof data == "object"
		? Object.keys(data)
				.filter((key) => data[key] !== null)
				.map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
				.join("&")
		: data.replace(/"/g, '\\"');
}
function toParamString(data) {
	return Object.keys(data)
		.map((key) => `${toAttrString(data[key])}`)
		.join(" ");
}
function toObjectString(data) {
	return `${toParamString(data)}`;
}

module.exports = function (req, res, url) {
  switch (req.method) {
    case "GET": {
      switch (url.pathname) {
        case "/movie/delete": {
          const id = url.query.movieId;
          if (fUtil.exists(env.MOVIE_FOLDER + `/${id}.txt`)) fs.unlinkSync(env.MOVIE_FOLDER + `/${id}.txt`);
          if (fUtil.exists(env.DATABASES_FOLDER + `/${id}-title.txt`)) fs.unlinkSync(env.DATABASES_FOLDER + `/${id}-title.txt`);
          if (fUtil.exists(env.DATABASES_FOLDER + `/${id}-desc.txt`)) fs.unlinkSync(env.DATABASES_FOLDER + `/${id}-desc.txt`);
          res.statusCode = 302;
          res.setHeader("Location", "/");
          res.end();
          return true;
        }
        case "/movie/fetch": {
          // if there is no id, fetch a random movie id and use it as the only starter.
          if (!url.query.movieid) {
            const id = "1734613";
            get(`https://web.archive.org/web/20200807182213if_/http://www.zimmertwins.com/movie/fetch?movieid=${id}`).then(buff => {
              if (!fUtil.exists(process.env.MOVIE_FOLDER + `/${id}.txt`)) fs.writeFileSync(process.env.MOVIE_FOLDER + `/${id}.txt`, buff);
              if (!fUtil.exists(env.DATABASES_FOLDER + `/${
                id
              }-title.txt`)) fs.writeFileSync(env.DATABASES_FOLDER + `/${id}-title.txt`, 'How2 Eat Tuna');
              if (!fUtil.exists(env.DATABASES_FOLDER + `/${id}-desc.txt`)) fs.writeFileSync(env.DATABASES_FOLDER + `/${id}-desc.txt`, '');
              if (!url.query.redirect) res.end(buff);
              else {
                res.statusCode = 302;
                res.setHeader("Location", `/studio?movieId=${id}${url.query.apiVer == "2" ? "&version=2" : ""}`);
                res.end();
              }
            }).catch(e => {
              console.log(e);
              if (url.query.redirect) {
                res.statusCode = 302;
                res.setHeader("Location", `/err?mesg=${e}`);
                res.end("ERROR OCCURED!");

              }
            });
          } else res.end(fs.readFileSync(env.MOVIE_FOLDER + `/${url.query.movieid}.txt`));
          return true;
        } case "/upload": {
          res.setHeader("Content-Type", "text/html; charset=utf8");
          var html;
          switch (url.query.type) {
            case "movie": {
              html = `<form enctype='multipart/form-data' action='/movie${
                url.path.slice(0, -11)
              }' method='post'><input id='file' type="file" onchange="this.form.submit()" name='import' accept=".txt" /></form>`;
              break;
            } default: {
              html = 'Type Not Found';
              break;
            }
          }
          res.end(html);
          return true;
        } case "/err": {
          res.end(`Error: ${url.query.mesg || "No Message Was Found."}`);
          return true;
        }
      }
      const match = req.url.match(/\/movie\/assets\/([^/]+)$/);
      if (!match) return;
      const file = match[1];
      get(`${env.SWF_URL}/${file}`).then(b => res.end(b)).catch(e => console.log(e));
      return true;
    } case "POST": {
      switch (req.url) {
        case "/movie/upload": {
          new formidable.IncomingForm().parse(req, (e, f, files) => {
            if (e || !files.import) return;
            const path = files.import.path;
            const buffer = fs.readFileSync(path);
            const id = fUtil.makeid(6);
            fs.writeFileSync(process.env.MOVIE_FOLDER + `/${id}.txt`, buffer);
            res.statusCode = 302;
            res.setHeader("Location", `/studio?movieId=${id}`);
            res.end();
          });
          return true;
        } case "/movie/save": {
          new formidable.IncomingForm().parse(req, (e, f) => {
            if (e) { 
              console.log(e); 
              return;
            }
            if (fs.existsSync(env.DATABASES_FOLDER + `/movieIdSection.json`)) {
              const idMeta = require('.' + env.DATABASES_FOLDER + `/movieIdSection.json`);
              const params = {
                meta: {
                  action: f.action,
                  thumbid: f.thumbid,
                  starterid: f.starterid || '',
                  description: f.description,
                  title: f.title,
                  moviexml: f.moviexml,
                  lang: f.lang,
                  movieid: idMeta.id,
                  userid: f.userid
                }
              };
              console.log(params.meta.movieid);
              fs.writeFileSync(env.MOVIE_FOLDER + `/${params.meta.movieid}.txt`, toObjectString(params));
              fs.writeFileSync(env.DATABASES_FOLDER + `/${params.meta.movieid}-title.txt`, params.meta.title);
              fs.writeFileSync(env.DATABASES_FOLDER + `/${params.meta.movieid}-desc.txt`, params.meta.description);
              res.end(toObjectString(params));
            } else {
              const params = {
                meta: {
                  action: f.action,
                  thumbid: f.thumbid,
                  starterid: f.starterid || '',
                  description: f.description,
                  title: f.title,
                  moviexml: f.moviexml,
                  lang: f.lang,
                  movieid: fUtil.makeid(6),
                  userid: f.userid
                }
              };
              console.log(params.meta.movieid);
              fs.writeFileSync(env.MOVIE_FOLDER + `/${params.meta.movieid}.txt`, toObjectString(params));
              fs.writeFileSync(env.DATABASES_FOLDER + `/${params.meta.movieid}-title.txt`, params.meta.title);
              fs.writeFileSync(env.DATABASES_FOLDER + `/${params.meta.movieid}-desc.txt`, params.meta.description);
              res.end(toObjectString(params));
            }
          });
          return true;
        } case "/movie/fetch": {
          loadPost(req, res).then(data => res.end(fs.readFileSync(env.MOVIE_FOLDER + `/${data.movieid}.txt`))).catch(e => console.log(e));
          return true;
        }
      }
    }
  }
}
