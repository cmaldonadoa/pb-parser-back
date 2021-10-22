const markdownpdf = require("markdown-pdf");
const moment = require("moment");

class Document {
  constructor() {
    this._doc = "";
  }

  build() {
    return this._doc;
  }

  br() {
    this._doc += "\n";
  }

  p(content) {
    this._doc += content + "\n";
  }

  h1(content) {
    this._doc += `# ${content}\n`;
  }

  h2(content) {
    this._doc += `## ${content}\n`;
  }

  h3(content) {
    this._doc += `### ${content}\n`;
  }

  li(content) {
    this._doc += `- ${content}\n`;
  }

  static img(url) {
    return `![](${url})`;
  }

  static imgL(url) {
    return `![image alt <](${url})`;
  }

  static imgR(url) {
    return `![image alt >](${url})`;
  }
}

const getResultsMd = ({ filename, type, username, tender, data }) => {
  const doc = new Document();

  doc.p(
    Document.imgL(`${__dirname}/svg/minvu.png`) +
      " " +
      Document.imgR(`${__dirname}/svg/parpro.svg`)
  );

  doc.h1("Reporte de resultados");
  doc.p("Nombre del modelo: " + filename);
  doc.p("Tipo del modelo: " + type);
  doc.p("Llamado: " + tender);
  doc.p("Autor: " + username);
  doc.p("Fecha: " + moment().locale("es").format("LLL"));

  doc.h2("Resumen");
  for (const groupName of Object.keys(data)) {
    const rules = data[groupName];
    const good = rules.filter((r) => !!r.bit).length;
    const bad = rules.filter((r) => !r.bit).length;
    doc.p(`${groupName}: ${good} cumplidas - ${bad} falladas`);
  }

  for (const groupName of Object.keys(data)) {
    doc.h2(groupName);

    const rules = data[groupName];
    for (const rule of rules) {
      const img = !!rule.bit
        ? Document.img(`${__dirname}/svg/ok.svg`)
        : Document.img(`${__dirname}/svg/x.svg`);
      doc.h3(img + " " + rule.name);
      !!rule.description && doc.p(rule.description);
      for (const value of rule.values) {
        doc.p(value);
      }
      doc.br();
    }
  }

  return doc.build();
};

module.exports = {
  writePdf: async (fileId, { filename, type, username, tender, data }) => {
    const md = getResultsMd({ filename, type, username, tender, data });

    await markdownpdf({
      cssPath: `${__dirname}/pdf.css`,
      paperBorder: { top: "1cm", left: "2cm", right: "2cm", bottom: "1.5cm" },
    })
      .from.string(md)
      .to(`${__dirname}/../../../files/${fileId}/results.pdf`);
  },
};
