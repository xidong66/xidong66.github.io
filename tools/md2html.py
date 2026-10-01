
#!/usr/bin/env python
"""Convert Markdown to standalone HTML with an installed Pandoc."""
import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description='Convert Markdown to standalone HTML with Pandoc.')
    parser.add_argument('input', type=Path, help='Markdown source file')
    parser.add_argument('-o', '--output', type=Path, help='HTML output (default: beside source)')
    parser.add_argument('--force', action='store_true', help='Overwrite an existing HTML file')
    args = parser.parse_args()
    source = args.input.resolve()
    output = (args.output or source.with_suffix('.html')).resolve()

    if not source.is_file():
        parser.error(f'Input file does not exist: {source}')
    if source.suffix.lower() not in {'.md', '.markdown'}:
        parser.error('Input must be a .md or .markdown file')
    if source == output:
        parser.error('Input and output must be different files')
    if output.suffix.lower() != '.html':
        parser.error('Output must be an .html file')
    if output.exists() and not args.force:
        parser.error('Output already exists; use --force to overwrite it')

    try:
        import pypandoc
    except ImportError:
        parser.error('Install pypandoc with: python -m pip install pypandoc')
    try:
        pypandoc.get_pandoc_path()
    except OSError:
        parser.error('Pandoc is required; install it from https://pandoc.org/installing.html')

    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        pypandoc.convert_file(str(source), 'html', format='markdown',
                             outputfile=str(output), extra_args=['--standalone'])
    except (OSError, RuntimeError) as error:
        parser.error(f'Conversion failed: {error}')
    print(f'Created {output}')


if __name__ == '__main__':
    main()
