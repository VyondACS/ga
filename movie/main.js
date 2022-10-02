const fs = require("fs");
const nodezip = require("node-zip");
const xmldoc = require("xmldoc");
const env = require("../env");
const source = env.CLIENT_URL;
const store = '.' + env.STATIC_STORE_URL;
const header = "<?xml version=\"1.0\" encoding=\"utf-8\"?>";
const fUtil = require("../fileUtil");
const asset = require("../asset/main");
const { get } = require("http");

function name2Font(font) {
	switch (font) {
		case "Blambot Casual":
			return "FontFileCasual";
		case "BadaBoom BB":
			return "FontFileBoom";
		case "Entrails BB":
			return "FontFileEntrails";
		case "Tokyo Robot Intl BB":
			return "FontFileTokyo";
		case "Accidental Presidency":
			return "FontFileAccidental";
		case "Budmo Jiggler":
			return "FontFileBJiggler";
		case "Budmo Jigglish":
			return "FontFileBJigglish";
		case "Existence Light":
			return "FontFileExistence";
		case "HeartlandRegular":
			return "FontFileHeartland";
		case "Honey Script":
			return "FontFileHoney";
		case "I hate Comic Sans":
			return "FontFileIHate";
		case "loco tv":
			return "FontFileLocotv";
		case "Mail Ray Stuff":
			return "FontFileMailRay";
		case "Mia\'s Scribblings ~":
			return "FontFileMia";
		case "Coming Soon":
			return "FontFileCSoon";
		case "Lilita One":
			return "FontFileLOne";
		case "Telex Regular":
			return "FontFileTelex";
		case "":
		case null:
			return '';
		default:
			return `FontFile${font.replace(/\s/g, '')}`;
	}
}

/**
 * Parses a movie XML by adding files to a ZIP.
 * @param {Buffer} xmlBuffer 
 * @returns {Promise<Buffer>}
 */
module.exports = {
    async basicParse(zip, themes, file, type, subtype) {
        const pieces = file.split(".");
		const themeId = pieces[0];
		const ext = pieces.pop();
		pieces[pieces.length - 1] += "." + ext;
		pieces.splice(1, 0, type);
		const filename = pieces.join(".");
		if (themeId == "ugc") {
			const id = pieces[2];
			try {
                asset.getFolders(type).then(folder => {
                    const buffer = fs.readFileSync(`${folder}/${filename}`);
                    fUtil.addToZip(zip, filename, buffer);
                    if (type == "prop" && subtype == "video") {
                        pieces[2] = pieces[2].slice(0, -3) + "png";
                        const filename = pieces.join(".")
                        const buff = fs.readFileSync(folder + "/" + pieces[2], true);
                        fUtil.addToZip(zip, filename, buff);
                    }
                }).catch(e => console.log(e));
            } catch (e) {
                console.error(`WARNING: ${id}:`, e);
                return;
            }
		} else {
			const filepath = `${store}/${pieces.join("/")}`;
			fUtil.addToZip(zip, filename, fs.readFileSync(filepath));
		}

		themes[themeId] = true;
	},
    async packMovie(xmlBuffer) {
        if (xmlBuffer.length == 0) throw null;
        const zip = nodezip.create();
        const themes = { common: true };
        var ugc = `${header}<theme id="ugc" name="ugc">`;
        fUtil.addToZip(zip, "movie.xml", xmlBuffer);
        const film = new xmldoc.XmlDocument(xmlBuffer);
        for (const eI in film.children) {
            const elem = film.children[eI];
    
            switch (elem.name) {
                case "sound": {
                    const file = elem.childNamed("sfile")?.val;
                    if (!file) continue;
                    
                    await this.basicParse(zip, themes, file, elem.name)
                    break;
                }
    
                case "scene": {
                    for (const e2I in elem.children) {
                        const elem2 = elem.children[e2I];
    
                        let tag = elem2.name;
                        // change the tag to the one in the store folder
                        if (tag == "effectAsset") tag = "effect";
    
                        switch (tag) {
                            case "durationSetting":
                            case "trans":
                                break;
                            case "bg":
                            case "effect":
                            case "prop": {
                                const file = elem2.childNamed("file")?.val;
                                if (!file) continue;
                                
                                await this.basicParse(zip, themes, file, tag, elem2.attr.subtype);
                                break;
                            }
                            
                            case "char": {
                                let file = elem2.childNamed("action")?.val;
                                if (!file) continue;
                                const pieces = file.split(".");
                                const themeId = pieces[0];
    
                                const ext = pieces.pop();
                                pieces[pieces.length - 1] += "." + ext;
                                pieces.splice(1, 0, elem2.name);
        
                                if (themeId == "ugc") {
                                    // remove the action from the array
                                    pieces.splice(3, 1);
    
                                    const id = pieces[2];
                                    try {
                                        const buffer = await char.load(id);
                                        const filename = pieces.join(".");
                                        const data = {
                                            id: id,
                                            type: "char",
                                            themeId: char.getTheme(buffer)
                                        }
                                        ugc += asset.getXmls(data);
                                        fUtil.addToZip(zip, filename + ".xml", buffer);
                                    } catch (e) {
                                        console.error(`WARNING: ${id}:`, e);
                                        continue;
                                    }
                                } else {
                                    const filepath = `${store}/${pieces.join("/")}`;
                                    const filename = pieces.join(".");
    
                                    fUtil.addToZip(zip, filename, fs.readFileSync(filepath));
                                }
    
                                for (const e3I in elem2.children) {
                                    const elem3 = elem2.children[e3I];
                                    if (!elem3.children) continue;
    
                                    // add props and head stuff
                                    file = elem3.childNamed("file")?.val;
                                    if (!file) continue;
                                    const pieces2 = file.split(".");
    
                                    // headgears and handhelds
                                    if (elem3.name != "head") {
                                        await basicParse(file, "prop");
                                    } else { // heads
                                        if (pieces2[0] == "ugc") continue;
                                        pieces2.pop(), pieces2.splice(1, 0, "char");
                                        const filepath = `${store}/${pieces2.join("/")}.swf`;
    
                                        pieces2.splice(1, 1, "prop");
                                        const filename = `${pieces2.join(".")}.swf`;
                                        fUtil.addToZip(zip, filename, fs.readFileSync(filepath));
                                    }
    
                                    themes[pieces2[0]] = true;
                                }
    
                                themes[themeId] = true;
                                break;
                            }
    
                            case 'bubbleAsset': {
                                const bubble = elem2.childNamed("bubble");
                                const text = bubble.childNamed("text");
    
                                // arial doesn't need to be added
                                if (text.attr.font == "Arial") continue;
    
                                const filename = `${name2Font(text.attr.font)}.swf`;
                                get(`${source}/go/font/${filename}`).then(buff => {
                                    fUtil.addToZip(zip, filename, buff);
                                }).catch(e => console.log(e));
                                break;
                            }
                        }
                    }
                    break;
                }
            }
        }
    
        if (themes.family) {
            delete themes.family;
            themes.custom = true;
        }
    
        if (themes.cc2) {
            delete themes.cc2;
            themes.action = true;
        }
    
        const themeKs = Object.keys(themes);
        themeKs.forEach(t => {
            if (t == 'ugc') return;
            const file = fs.readFileSync(`${store}/${t}/theme.xml`);
            fUtil.addToZip(zip, `${t}.xml`, file);
        });
    
        fUtil.addToZip(zip, 'themelist.xml', Buffer.from(`${header}<themes>${
            themeKs.map(t => `<theme>${t}</theme>`).join('')}</themes>`));
        fUtil.addToZip(zip, 'ugc.xml', Buffer.from(ugc + `</theme>`));
        return await zip.zip();
    },
};