"""临时脚本:把 Markdown 转成自包含 HTML。用完即删。"""
import sys
from pathlib import Path

import markdown
from pygments.formatters import HtmlFormatter

SRC = Path(sys.argv[1])
DST = Path(sys.argv[2])

md_text = SRC.read_text(encoding="utf-8")

# 让 jsonc 也能高亮(pygments 无 jsonc lexer,但有 json)
md_text = md_text.replace("```jsonc", "```json")

html_body = markdown.markdown(
    md_text,
    extensions=[
        "fenced_code",      # ``` 代码块
        "tables",           # 错误排查表
        "codehilite",       # pygments 高亮
        "toc",              # 目录锚点
        "attr_list",        # 列表/段落属性
        "sane_lists",       # 更稳健的列表解析
        "nl2br",            # 换行转 <br>
    ],
    extension_configs={
        "codehilite": {"guess_lang": False, "css_class": "codehilite"},
        "toc": {"permalink": "#", "anchorlink": False},
    },
)

pygments_css = HtmlFormatter(style="friendly").get_style_defs(".codehilite")

CSS = f"""
* {{ box-sizing: border-box; }}
body {{
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
               "Microsoft YaHei", "Hiragino Sans GB", sans-serif;
  font-size: 16px; line-height: 1.7; color: #24292f;
  max-width: 1012px; margin: 0 auto; padding: 32px 24px 96px;
  background: #fff;
}}
h1, h2, h3, h4, h5, h6 {{ font-weight: 600; line-height: 1.25; margin: 28px 0 16px; }}
h1 {{ font-size: 2em; padding-bottom: .3em; border-bottom: 1px solid #d0d7de; }}
h2 {{ font-size: 1.5em; padding-bottom: .3em; border-bottom: 1px solid #d0d7de; }}
h3 {{ font-size: 1.25em; }} h4 {{ font-size: 1em; }}
a {{ color: #0969da; text-decoration: none; }}
a:hover {{ text-decoration: underline; }}
p {{ margin: 0 0 16px; }}
ul, ol {{ padding-left: 2em; margin: 0 0 16px; }}
li {{ margin: 4px 0; }}
blockquote {{
  margin: 0 0 16px; padding: 0 1em; color: #57606a;
  border-left: .25em solid #d0d7de;
}}
blockquote > :first-child {{ margin-top: 0; }}
blockquote > :last-child {{ margin-bottom: 0; }}
hr {{ border: 0; border-top: 1px solid #d0d7de; margin: 32px 0; }}
/* 代码:等宽字体 + 横向滚动,保护 ASCII 流程图 */
code, pre, kbd, samp {{
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo,
               "Courier New", monospace;
  font-size: 13.5px;
}}
code {{ padding: .2em .4em; background: rgba(175,184,193,.2); border-radius: 6px; }}
pre {{ margin: 0 0 16px; padding: 16px; overflow: auto; line-height: 1.45;
       background: #f6f8fa; border-radius: 6px; }}
pre code {{ padding: 0; background: none; }}
/* 表格 */
table {{ border-collapse: collapse; margin: 0 0 16px; display: block; width: 100%;
         overflow: auto; }}
table th, table td {{ padding: 6px 13px; border: 1px solid #d0d7de; }}
table th {{ font-weight: 600; background: #f6f8fa; }}
table tr {{ background: #fff; }}
table tr:nth-child(2n) {{ background: #f6f8fa; }}
img {{ max-width: 100%; }}
{pygments_css}
"""

html_doc = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{SRC.stem}</title>
<style>{CSS}</style>
</head>
<body>
{html_body}
</body>
</html>
"""

DST.write_text(html_doc, encoding="utf-8")
print(f"OK: {SRC} -> {DST}  ({len(html_doc)} bytes)")
