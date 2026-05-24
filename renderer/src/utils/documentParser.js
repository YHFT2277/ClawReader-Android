/**
 * 文档解析工具 - 支持 Word、Excel、PPT
 */

import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * 解析 Word 文档 (.docx)
 * @param {ArrayBuffer} arrayBuffer - 文件内容
 * @returns {Promise<string>} - 提取的文本
 */
export async function parseWordDocument(arrayBuffer) {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Word 解析错误:', error);
    throw new Error('无法解析 Word 文档');
  }
}

/**
 * 解析 Excel 表格 (.xlsx)
 * @param {ArrayBuffer} arrayBuffer - 文件内容
 * @returns {Promise<string>} - 提取的文本（表格形式）
 */
export async function parseExcelDocument(arrayBuffer) {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let text = '';
    
    // 遍历所有工作表
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (index > 0) text += '\n\n';
      text += `=== ${sheetName} ===\n`;
      
      // 转换为文本表格
      jsonData.forEach(row => {
        if (row && row.length > 0) {
          text += row.join('\t') + '\n';
        }
      });
    });
    
    return text || '空表格';
  } catch (error) {
    console.error('Excel 解析错误:', error);
    throw new Error('无法解析 Excel 表格');
  }
}

/**
 * 解析 PPT 演示文稿 (.pptx)
 * @param {ArrayBuffer} arrayBuffer - 文件内容
 * @returns {Promise<string>} - 提取的文本
 */
export async function parsePPTDocument(arrayBuffer) {
  try {
    // 使用 JSZip 解压 pptx 文件并提取文本
    const JSZip = await import('jszip');
    const zip = await JSZip.default.loadAsync(arrayBuffer);
    
    let text = '';
    const slideFiles = [];
    
    // 找到所有幻灯片文件
    zip.forEach((relativePath, zipEntry) => {
      if (relativePath.match(/^ppt\/slides\/slide\d+\.xml$/)) {
        slideFiles.push(zipEntry);
      }
    });
    
    // 按顺序解析幻灯片
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.name.match(/slide(\d+)/)[1]);
      const numB = parseInt(b.name.match(/slide(\d+)/)[1]);
      return numA - numB;
    });
    
    for (let i = 0; i < slideFiles.length; i++) {
      const content = await slideFiles[i].async('text');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'application/xml');
      
      // 提取所有文本节点
      const textElements = xmlDoc.getElementsByTagName('a:t');
      let slideText = '';
      for (let j = 0; j < textElements.length; j++) {
        slideText += textElements[j].textContent;
      }
      
      if (slideText.trim()) {
        text += `\n--- 幻灯片 ${i + 1} ---\n${slideText}\n`;
      }
    }
    
    return text.trim() || '空演示文稿';
  } catch (error) {
    console.error('PPT 解析错误:', error);
    throw new Error('无法解析 PPT 演示文稿');
  }
}

/**
 * 根据文件扩展名选择解析器
 * @param {string} fileName - 文件名
 * @param {ArrayBuffer} arrayBuffer - 文件内容
 * @returns {Promise<{text: string, type: string}>}
 */
export async function parseDocument(fileName, arrayBuffer) {
  const ext = fileName.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'docx':
      return {
        text: await parseWordDocument(arrayBuffer),
        type: 'word'
      };
    case 'xlsx':
      return {
        text: await parseExcelDocument(arrayBuffer),
        type: 'excel'
      };
    case 'pptx':
      return {
        text: await parsePPTDocument(arrayBuffer),
        type: 'ppt'
      };
    default:
      // 尝试作为文本读取
      const decoder = new TextDecoder('utf-8');
      return {
        text: decoder.decode(arrayBuffer),
        type: 'text'
      };
  }
}

/**
 * 获取文件类型显示名称
 * @param {string} type - 文件类型标识
 * @returns {string} - 显示名称
 */
export function getFileTypeLabel(type) {
  const labels = {
    word: 'Word',
    excel: 'Excel',
    ppt: 'PPT',
    text: '文本'
  };
  return labels[type] || '未知';
}

/**
 * 获取文件类型颜色
 * @param {string} type - 文件类型标识
 * @returns {string} - CSS 颜色值
 */
export function getFileTypeColor(type) {
  const colors = {
    word: '#2b579a',
    excel: '#217346',
    ppt: '#d24726',
    text: '#6c757d'
  };
  return colors[type] || '#6c757d';
}
