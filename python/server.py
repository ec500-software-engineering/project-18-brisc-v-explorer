import flask
import json
import zipstream
import string
import fileinput
import os
import sys
import git
import shutil
import tempfile

app = flask.Flask(__name__)

@app.route('/')
def index():
    return 'Hello world'

@app.route('/verilog_fetch', methods=['GET','POST'])
def dataParsing():
    data = {}
    data['core'] = flask.request.args.get('core')
    data['data_width'] = flask.request.args.get('data_width')
    data['index_bits'] = flask.request.args.get('index_bits')
    data['offset_bits'] = flask.request.args.get('offset_bits')
    data['address_bits'] = flask.request.args.get('address_bits')
    data['program'] = flask.request.args.get('program')
    #data = flask.request.get_json() 
    wd = parameterSub(data)
    resp = fileFetching(wd)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, PUT, DELETE, OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Origin, Content-Type, X-Auth-Token'
    return resp

def fileFetching(wd):
    def generator():
        z = zipstream.ZipFile(mode='w') #, compression=ZIP_DEFLATED)
        for folder,subfolders,files in os.walk(wd):
            for filename in files:
                fp = os.path.join(folder,filename)
                z.write(fp)
        #z.write('/home/rashmi/project-18-brisc-v-explorer/index.html')
        #z.write('/home/rashmi/project-18-brisc-v-explorer/read_repo.py')
        for chunk in z:
            yield chunk

    resp = flask.Response(generator(), mimetype='application/zip')
    resp.headers['Content-Disposition'] = 'attachment; filename={}'.format('files.zip')
    return resp

#substitute parameters in the project template file with the received json file
def parameterSub(data):
    # get current directory path
    cd = os.getcwd()
    
    # create workspace directory path and git repo path
    gd = os.path.join(cd,'git_repo_dir')
    wd = os.path.join(cd,'work_space')
    
    # check if the git repo directory already exists
    if not os.path.exists(gd):
        os.mkdir(gd)

    # check if the git repo is already cloned, if not clone the project from repo
    if os.listdir(gd) == 0:          
        # clone into git repo dir
        git.Repo.clone_from('https://github.com/rashmi2383/BRISCV_Verilog.git', gd, branch='master', depth=1)

    # check if the workspace directory already exists
    if not os.path.exists(wd):
        os.mkdir(wd)

    if os.listdir(wd) == 0:
        shutil.copy(os.path.join(gd,'project_template.v'),os.path.join(wd,'project_template.v'))   
        
    # create path of the pulled template file
    fpath = os.path.join(wd,'project_template.v')
    
    for line in fileinput.input(fpath,inplace=True):
        if line.startswith('  parameter CORE'):
            print('  parameter CORE = %s' % str(data['core']))
        elif line.startswith('  parameter DATA_WIDTH'):
            print('  parameter DATA_WIDTH = %s' %  data['data_width'])
        elif line.startswith('  parameter INDEX_BITS'):
            print('  parameter INDEX_BITS = %s' % str(data['index_bits']))
        elif line.startswith('  parameter OFFSET_BITS'):
            print('  parameter OFFSET_BITS = %s' % str(data['offset_bits']))
        elif line.startswith('  parameter ADDRESS_BITS'):
            print('  parameter ADDRESS_BITS = %s' % data['address_bits'])
        elif line.startswith('  parameter PROGRAM'):
            print('  parameter PROGRAM = \'%s\'' % str(data['program']))
        else:
            sys.stdout.write(line)
    return wd

def main():
    app.run(debug=True, host='0.0.0.0')

if __name__ == '__main__':
    main()
