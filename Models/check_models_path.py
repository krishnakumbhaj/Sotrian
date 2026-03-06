import os
import re

# Safely extract the get_default_models_path function from main.py without importing the whole module
MAIN_PY = r'X:\Web Development\Nextjs_Projects\Sotrian\Models\main.py'

with open(MAIN_PY, 'r', encoding='utf-8') as f:
	src = f.read()

lines = src.splitlines()
start = None
for i, line in enumerate(lines):
	if line.strip().startswith('def get_default_models_path'):
		start = i
		break

if start is None:
	raise SystemExit('get_default_models_path not found in main.py')

# Collect the function block (lines indented after the def)
func_lines = [lines[start]]
for j in range(start+1, len(lines)):
	# stop when we reach a top-level def/class or EOF
	if lines[j].startswith('def ') or lines[j].startswith('class '):
		break
	func_lines.append(lines[j])

exec_src = 'import os\n' + '\n'.join(func_lines) + '\nprint("Computed MODELS path ->", get_default_models_path())\nprint("Exists?", os.path.exists(get_default_models_path()))\n'

# Execute in a clean namespace
ns = {}
ns['__file__'] = MAIN_PY
exec(exec_src, ns, ns)
