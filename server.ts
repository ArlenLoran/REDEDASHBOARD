import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ExcelJS = require("exceljs");

async function startServer() {
  console.log("Iniciando servidor...");
  const app = express();
  const PORT = 3000;

  // API Route to read and process Excel data using ExcelJS (more robust)
  app.get("/api/excel-data", async (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "Consenso.xlsx");
      
      if (!fs.existsSync(filePath)) {
        console.error("Arquivo não encontrado:", filePath);
        return res.status(404).json({ error: "File Consenso.xlsx not found" });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const worksheet = workbook.getWorksheet(1); // Get the first worksheet
      if (!worksheet) {
        throw new Error("No worksheet found in Excel file");
      }

      const data: any[] = [];
      const headers: string[] = [];
      
      // Get headers from first row
      const firstRow = worksheet.getRow(1);
      firstRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.text ? String(cell.text).trim() : "";
      });

      // Get data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            // ExcelJS handles values better, sometimes returning objects for dates/formulas
            let value = cell.value;
            if (value && typeof value === 'object' && 'result' in value) {
              value = value.result;
            }
            rowData[header] = value;
          }
        });
        data.push(rowData);
      });

      // Filter: INFORMACAO === "Montagem Kit total" AND PERIODO === "M+1"
      const filteredData = data.filter(row => {
        const info = String(row["INFORMACAO"] || "").trim();
        const periodo = String(row["PERIODO"] || "").trim();
        return info === "Montagem Kit total" && periodo === "M+1";
      });

      const totalPlanned = filteredData.reduce((acc, row) => {
        const value = Number(row["QTD_DIARIA"]) || 0;
        return acc + value;
      }, 0);

      res.json({
        totalPlanned,
        count: filteredData.length
      });
    } catch (error) {
      console.error("Erro ao processar arquivo Excel (ExcelJS):", error);
      res.status(500).json({ error: "Failed to process excel file" });
    }
  });

  // API Route to fetch Kit Availability from Power Automate
  app.post("/api/kit-availability", async (req, res) => {
    try {
      const API_URL = "https://51a805d34213e248a3506f5db8fe28.55.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/655aac37bdea49b1b1221a2f37198754/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=-2l0x4h5cwmpZ20RCIbMrzaR0860ka4aB8_dDOVQQHQ";

      const query = `
SELECT 
    TRUNC(trndte) data,
    item,
    mascara,
    SUM(quantidade) quantidade,
    status_inicial,
    status_final
FROM (
    SELECT 
        trndte,
        dtlnum,
        trndte AS data,
        prtnum AS item,
        lotnum AS mascara,
        trnqty AS quantidade,
        dscmst.lngdsc AS status_inicial,
        dscmst2.lngdsc AS status_final,
        ROW_NUMBER() OVER (
            PARTITION BY dtlnum
            ORDER BY trndte DESC
        ) AS rn
    FROM dlytrn
    INNER JOIN dscmst 
        ON dscmst.colval = dlytrn.frinvs 
       AND dscmst.locale_id = 'US_ENGLISH' 
       AND dscmst.colnam = 'invsts' 
    INNER JOIN dscmst dscmst2 
        ON dscmst2.colval = dlytrn.toinvs 
       AND dscmst2.locale_id = 'US_ENGLISH' 
       AND dscmst2.colnam = 'invsts'
    WHERE actcod = 'INVSTSCHG' 
      AND dlytrn.frinvs IN ('GKI','TKI') 
      AND dlytrn.toinvs IN ('GDK','GGRK','TRRK') 
      AND usr_id = 'API'
)
WHERE rn = 1
  AND status_final = 'GDK - Good Disponivel KIT'
GROUP BY
    TRUNC(trndte),
    item,
    mascara,
    status_inicial,
    status_final
      `.trim();

      // Adicionando um sinal de timeout para a requisição (ajuda em redes lentas/locais)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query,
          id_score: "kit_availability"
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results: any[] = await response.json();
      
      const totalAvailable = results.reduce((acc, row) => {
        const qty = Number(row["QUANTIDADE"] || row["quantidade"] || 0);
        return acc + qty;
      }, 0);

      res.json({ totalAvailable });
    } catch (error) {
      console.error("Erro ao buscar disponibilidade KIT:", error);
      // Retornamos 0 amigável caso a rede falhe (comum em ambiente local restrito)
      res.json({ totalAvailable: 0, error: "Network timeout or connection refused locally" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Configurando middleware do Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erro fatal ao iniciar servidor:", err);
});
