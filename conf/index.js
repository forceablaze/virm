'use strict'

const NAME = 'DAMain';
const QPKG_CONF_PATH = '/etc/config/qpkg.conf';

import SubProcess from '../module/process';

let install_path = '';

try  {
    let getcfg = new SubProcess('/sbin/getcfg',
            [NAME, 'Install_Path', '-f', QPKG_CONF_PATH])
            .runSync();

    install_path = getcfg.stdout.toString().trim();
} catch(e) {
    switch(e.code) {
        case 'ENOENT':
            install_path = '';
            break;
        default:
    }
}

const CONF = {
    INSTALL_PATH: install_path,

    IMAGE_PATH: install_path + '/var/images',

    BIN_PATH: install_path + '/usr/bin',

    SOCKET_PATH: install_path + '/var/run/virmanager.sock',

    RUN_PATH: install_path + '/var/run/virm',

    LOG_PATH: install_path + '/var/log'
};

export default CONF;
