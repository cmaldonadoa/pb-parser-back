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

function toCamelCase(name) {
  return name
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
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
    const bad = rules.filter((r) => !r.bit && r.values.length === 0).length;
    const pending = rules.filter((r) => !r.bit && r.values.length > 0).length;
    doc.p(
      `${groupName}: ${good} cumplidas - ${bad} falladas - ${pending} a verificar por revisor`
    );
  }

  for (const groupName of Object.keys(data)) {
    doc.h2(groupName);

    const rules = data[groupName];
    for (const rule of rules) {
      const img = !rule.bit
        ? rule.values.length > 0
          ? Document.img(`${__dirname}/svg/minus.png`)
          : Document.img(`${__dirname}/svg/x.svg`)
        : Document.img(`${__dirname}/svg/ok.svg`);
      doc.h3(img + " " + rule.name);
      !!rule.description && doc.p(rule.description);
      !!rule.values.length > 0 && doc.br();
      if (rule.values.length === 1)
        doc.p("Valor encontrado: " + rule.values[0]);
      else if (rule.values.length > 1) {
        doc.p("Valores encontrados: ");
        for (const value of rule.values) {
          doc.p(value);
        }
      }
      doc.br();

      !!rule.details && doc.p("Detalles");
      const s = "&nbsp;&nbsp;&nbsp;";
      !!rule.details &&
        rule.details.map((e, i) => {
          const prefix0 = i < rule.details.length - 1 ? "├" : "└";

          doc.p(
            `${s}${prefix0} Recinto: ${
              e.spaces.length > 0
                ? e.spaces[0][0] === "#"
                  ? toCamelCase(e.spaces[0].slice(1))
                  : toCamelCase(e.spaces[0])
                : "Todo el modelo"
            }`
          );

          const prefix1 = i < rule.details.length - 1 ? "│" + s : s + s;
          e.meta.length === 0 &&
            doc.p(s + prefix1 + "└ No hay información para mostrar");

          e.meta.map((m, j) => {
            const prefix2_1 =
              i < rule.details.length - 1 ? "│" + s : "&nbsp;&nbsp;" + s;
            const prefix2_2 = j < e.meta.length - 1 ? "├" : "└";
            doc.p(`${s}${prefix2_1} ${prefix2_2} ${m.entity} (ID: ${m.id})`);
            Object.keys(m.values).map((v, k) => {
              const prefix3_1 =
                i < rule.details.length - 1 ? "│" + s : "&nbsp;&nbsp;" + s;
              const prefix3_2 =
                j < e.meta.length - 1 ? "│" + s : "&nbsp;&nbsp;" + s;
              const prefix3_3 =
                k < Object.keys(m.values).length - 1 ? "├" : "└";
              doc.p(
                `${s}${prefix3_1} ${prefix3_2} ${prefix3_3}  ${v} = ${m.values[v]}`
              );
            });
          });
        });
      doc.br();
    }
  }

  return doc.build();
};

module.exports = {
  writePdf: async (
    fileId,
    { filename, type, username, tender, data },
    callback
  ) => {
    const md = getResultsMd({ filename, type, username, tender, data });

    markdownpdf({
      cssPath: `${__dirname}/pdf.css`,
      paperBorder: { top: "1cm", left: "2cm", right: "2cm", bottom: "1.5cm" },
    })
      .from.string(md)
      .to(`${__dirname}/../../../files/${fileId}/results.pdf`, callback);
  },
};
