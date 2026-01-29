import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import moment from "moment";

export async function generateZipWithPDFAndExcel({
  pdfBlob,
  excelBlob,
  locationName,
}) {
  const zip = new JSZip();
  zip.file(
    `${locationName}_Report_${moment().format("YYYY-MM-DD_HHmm")}.pdf`,
    pdfBlob
  );
  zip.file(
    `${locationName}_Report_${moment().format("YYYY-MM-DD_HHmm")}.xlsx`,
    excelBlob
  );
  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(
    zipBlob,
    `${locationName}_Reports_${moment().format("YYYY-MM-DD_HHmm")}.zip`
  );
}
