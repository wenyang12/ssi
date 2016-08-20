/**
 * Server Side Include
 * @author luoying
 */

'use strict';

const fs = require('fs');
const path = require('path');
const getMatchs = require('@tools/matchs');
const resolvePath = require('@tools/resolve-path');

// 检测页面是否启用ssi
const REG_SSI = /<html.+_ssi="true"/;
// include规则
const REG_INCLUDE = /<!\-\-\#\s*include\s+(file|virtual)=["|'](.*)["|']\s*\-\->/gi;
// 匹配ssi中的资源引用（排除 a[href="#anchor"]）
const REG_ASSETS = /(?:src|href|poster)=["|']?([^"'#]+)["|']?/gi;

// 执行include
const include = (html, dirname, root) => {
  // 扫描html文档，提取出来匹配的include片段
  let matchs = getMatchs(html, REG_INCLUDE);
  matchs.forEach((match) => {
    // 相对路径，相对于请求页面；绝对路径，相对于root
    let isAbsolute = match[1] === 'virtual';
    let ssiUrl = isAbsolute ? path.join(root, match[2]) : path.resolve(dirname, match[2]);
    let ssiHtml = '';

    try {
      ssiHtml = fs.readFileSync(ssiUrl, 'utf8').replace(/\n*$/, ''); // 删除末尾换行
    } catch (e) {
      ssiHtml = `<p>ssi error: not found ${match[2]}</p>`;
    }

    let ssiDirname = path.dirname(ssiUrl);
    // resolve ssi中引用的静态资源的相对路径
    ssiHtml = resolvePath(ssiHtml, ssiDirname, root, REG_ASSETS);
    // 对ssi本身执行include（因为ssi内部也可能有include）
    ssiHtml = include(ssiHtml, ssiDirname, root);
    // 用include 进来的ssi片段替换include碎片引用
    html = html.replace(match[0], ssiHtml);
  });
  return html;
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
