/**
 * Server Side Include
 * @author luoying
 */

'use strict';

const fs = require('fs');
const path = require('path');

// 检测页面是否启用ssi
const REG_SSI = /<html.+_ssi="true"/;
// include规则
const REG_INCLUDE = /<!\-\-\#\s*include\s+(file|virtual)=["|'](.*)["|']\s*\-\->/gi;
// 静态资源类型列表
const STATIC_TYPES = 'js|css|png|jpg|jpeg|gif|webp|svg|mp4|webm|mp3';
// 扫描静态资源
const REG_STATIC = new RegExp(`[src|href]+=["|']([^http|https|\/\/].+\\.[${STATIC_TYPES}]+)["|']`, 'gi');

const getMatchs = (data, reg) => {
  let matchs = [];
  let match = null;
  while ((match = reg.exec(data))) matchs.push(match);
  return matchs;
};

// 执行include
const include = (html, base, root) => {
  // 扫描html文档，提取出来匹配的include片段
  let matchs = getMatchs(html, REG_INCLUDE);
  matchs.forEach((match) => {
    // 相对路径，相对于请求页面；绝对路径，相对于root
    let isAbsolute = match[1] === 'virtual';
    let ssiUrl = isAbsolute ? path.join(root, match[2]) : path.resolve(base, match[2]);
    let ssiHtml = '';

    try {
      ssiHtml = fs.readFileSync(ssiUrl, 'utf8');
    } catch (e) {
      ssiHtml = `<p>ssi error: not found ${match[2]}</p>`;
    }

    let ssiBase = path.dirname(ssiUrl);
    // resolve ssi中引用的静态资源的相对路径
    ssiHtml = resolveStatic(ssiHtml, ssiBase, root);
    // 对ssi本身执行include（因为ssi内部也可能有include）
    ssiHtml = include(ssiHtml, ssiBase, root);
    // 用include 进来的ssi片段替换include碎片引用
    html = html.replace(match[0], ssiHtml);
  });
  return html;
};

// 将ssi碎片中引用的静态资源相对路径转换为绝对路径
// 如果引用的就是绝对路径，略过
const resolveStatic = (ssi, base, root) => {
  // 扫描ssi碎片，提取出来匹配的静态资源引用
  let matchs = getMatchs(ssi, REG_STATIC);
  matchs.forEach((match) => {
    let st = match[1];
    if (path.isAbsolute(st)) return;
    st = path.resolve(base, st).replace(root, '');
    ssi = ssi.replace(match[1], st);
  });
  return ssi;
};

// 渲染ssi
// 遍历页面中的ssi规则，取出对应的碎片替换上去
// file：相对于该页面
// virtual：相对于site root
exports.render = (html, options) => {
  if (options.isUrl) html = fs.readFileSync(html, 'utf8');
  if (!REG_SSI.test(html)) return html;
  return include(html, options.root, options.root);
};
