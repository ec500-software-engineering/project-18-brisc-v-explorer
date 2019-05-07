import os
import sys
import git
import shutil
import flask
import traceback
import zipstream
import fileinput

app = flask.Flask(__name__)

VERILOG_REPO_DIR = '/tmp/verilog_repo'
WORKSPACE_ROOT_DIR = '/tmp/verilog'


@app.route('/verilog_fetch', methods=['GET', 'POST'])
def handle_verilog_fetch():
    core_params = {'core': flask.request.args.get('core'), 'data_width': flask.request.args.get('data_width'),
            'index_bits': flask.request.args.get('index_bits'), 'offset_bits': flask.request.args.get('offset_bits'),
            'address_bits': flask.request.args.get('address_bits'), 'program': flask.request.args.get('program')}
    initialize_top_module_file(core_params)
    resp = get_zip_files_response(WORKSPACE_ROOT_DIR)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, PUT, DELETE, OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Origin, Content-Type, X-Auth-Token'
    return resp


def get_zip_files_response(workspace_dir):
    def generator():
        z = zipstream.ZipFile(mode='w')
        for folder, sub_folder, files in os.walk(workspace_dir):
            for filename in files:
                og_path = os.path.join(folder, filename)
                zip_path = og_path
                if VERILOG_REPO_DIR in zip_path:
                    zip_path = zip_path.replace(VERILOG_REPO_DIR, '')
                elif WORKSPACE_ROOT_DIR in zip_path:
                    zip_path = zip_path.replace(WORKSPACE_ROOT_DIR, '')
                z.write(og_path, arcname=zip_path)
        for chunk in z:
            yield chunk

    resp = flask.Response(generator(), mimetype='application/zip')
    resp.headers['Content-Disposition'] = 'attachment; filename={}'.format('files.zip')
    return resp


def initialize_top_module_file(core_params):
    top_module_path = os.path.join(WORKSPACE_ROOT_DIR, 'project_template.v')
    shutil.copy(
        os.path.join(VERILOG_REPO_DIR, 'project_template.v'), top_module_path)

    for line in fileinput.input(top_module_path, inplace=True):
        if line.startswith('  parameter CORE'):
            print('  parameter CORE = %s' % str(core_params['core']))
        elif line.startswith('  parameter DATA_WIDTH'):
            print('  parameter DATA_WIDTH = %s' % core_params['data_width'])
        elif line.startswith('  parameter INDEX_BITS'):
            print('  parameter INDEX_BITS = %s' % str(core_params['index_bits']))
        elif line.startswith('  parameter OFFSET_BITS'):
            print('  parameter OFFSET_BITS = %s' % str(core_params['offset_bits']))
        elif line.startswith('  parameter ADDRESS_BITS'):
            print('  parameter ADDRESS_BITS = %s' % core_params['address_bits'])
        elif line.startswith('  parameter PROGRAM'):
            print('  parameter PROGRAM = \'%s\'' % str(core_params['program']))
        else:
            sys.stdout.write(line)


def setup():
    if not os.path.exists(WORKSPACE_ROOT_DIR):
        os.makedirs(WORKSPACE_ROOT_DIR, exist_ok=True)
    if not os.path.exists(VERILOG_REPO_DIR):
        os.makedirs(VERILOG_REPO_DIR, exist_ok=True)
    try:
        git.Repo.clone_from(
            'https://github.com/rashmi2383/BRISCV_Verilog.git',
            VERILOG_REPO_DIR, branch='master'
        )
    except git.GitCommandError as ex:
        traceback.print_exc()


def main():
    setup()
    app.run(debug=True, host='0.0.0.0', port=8000)


if __name__ == '__main__':
    main()
