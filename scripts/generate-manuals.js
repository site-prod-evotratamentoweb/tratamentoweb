import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('manuais');
const clean = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[^ -~]/g, '');
const escapePdf = (text) => clean(text).replace(/([\\()])/g, '\\$1');
const wrap = (text, width = 88) => {
  const words = clean(text).split(/\s+/); const lines = []; let line = '';
  for (const word of words) { const next = line ? `${line} ${word}` : word; if (next.length > width) { lines.push(line); line = word; } else line = next; }
  if (line) lines.push(line); return lines;
};

function createPdf(title, sections) {
  const rows = [{ text: title, size: 20, gap: 24 }];
  for (const section of sections) {
    rows.push({ text: section.heading, size: 14, gap: 19 });
    for (const paragraph of section.paragraphs) wrap(paragraph).forEach((line, index) => rows.push({ text: line, size: 10, gap: index === wrap(paragraph).length - 1 ? 16 : 13 }));
  }
  const pages = []; let page = []; let y = 790;
  for (const row of rows) { if (y < 55) { pages.push(page); page = []; y = 790; } page.push({ ...row, y }); y -= row.gap; }
  if (page.length) pages.push(page);
  const objects = []; const add = (value) => (objects.push(value), objects.length);
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pagesId = add('PAGES_PLACEHOLDER'); const pageIds = [];
  for (const contentRows of pages) {
    const stream = contentRows.map((row) => `BT /F1 ${row.size} Tf 52 ${row.y} Td (${escapePdf(row.text)}) Tj ET`).join('\n');
    const content = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

const professional = [
  ['1. Preparacao', 'Selecione o paciente no campo superior. Todo plano pertence ao paciente selecionado.'],
  ['2. Lista de Alimentos', 'Abra Lista de Alimentos para pesquisar, criar e editar itens. Cadastre categoria, unidade, gramatura, calorias, carboidratos, proteinas e gorduras. Configuracoes permite revisar categorias e unidades. Atualizar TACO incorpora a base padrao. A lista pode ser importada ou exportada em XLSX.'],
  ['3. Novo Plano', 'Clique em Novo Plano Alimentar, informe a meta diaria em kcal, selecione uma refeicao, escolha alimento e quantidade e use o botao +. Repita nas demais refeicoes e salve.'],
  ['4. Refeicoes e modais', 'Obs registra orientacoes da refeicao. O olho abre detalhes nutricionais. O lapis edita. O botao + cria substituicao e X remove. Os itens podem ser reorganizados.'],
  ['5. Painel nutricional', 'Exibir Plano mostra total de calorias comparado com a meta e gramas de proteinas, carboidratos, lipidios, fibras, gordura saturada e trans. Dados ausentes ficam zerados e nao sao estimados. O olho de cada refeicao mostra o subtotal.'],
  ['6. Importar e exportar', 'Importar Plano recebe XLSX compativel. Depois da importacao, confira paciente, quantidades e totais. Em Exibir Plano, abra o menu e use Exportar para gerar PDF ou XLSX.'],
  ['7. Editar e plano atual', 'Use Tornar atual para indicar a prescricao vigente. Em Exibir Plano, use Editar Plano e conclua a edicao. Excluir Plano e definitivo e exige confirmacao.'],
  ['8. Check-in do paciente', 'No acesso do paciente, Refeicao realizada registra a adesao diaria. O contador mostra quantas refeicoes foram concluidas. O check-in nao altera a prescricao.']
].map(([heading, text]) => ({ heading, paragraphs: [text] }));
const patient = [
  ['1. Abrir o plano', 'Acesse Meu Plano Alimentar, localize o plano marcado como ATUAL e clique no cabecalho para expandir.'],
  ['2. Entender o resumo', 'O painel apresenta calorias prescritas e meta diaria, proteinas, carboidratos, lipidios, fibras, gordura saturada e trans. Cada refeicao apresenta seu subtotal.'],
  ['3. Fazer check-in', 'Depois de seguir uma refeicao, marque Refeicao realizada. O contador diario sera atualizado. Se marcou por engano, desmarque.'],
  ['4. Resultado esperado', 'Ao final do dia, o contador mostra quantas refeicoes foram cumpridas. A barra calorica representa a prescricao; o check-in registra a adesao. Nao altere quantidades sem orientacao profissional.']
].map(([heading, text]) => ({ heading, paragraphs: [text] }));

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'manual-plano-alimentar.pdf'), createPdf('Manual de Uso - Plano Alimentar', professional));
await writeFile(path.join(outputDir, 'manual-plano-alimentar-paciente.pdf'), createPdf('Manual de Uso - Meu Plano Alimentar', patient));
console.log('Manuais PDF gerados.');
