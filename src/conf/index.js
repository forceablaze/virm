'use strict'

const NAME = 'DAMain';
const QPKG_CONF_PATH = '/etc/config/qpkg.conf';

import SubProcess from '../module/process';

let install_path = '/home/bedivere/git/virmanager/virm/';
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

install_path = '/home/bedivere/git/virmanager/virm/';

const CONF = {
    INSTALL_PATH: install_path,

    IMAGE_PATH: '/home/bedivere/qemu/centos',

    BIN_PATH: '/usr/bin',

    SOCKET_PATH: install_path + '/var/run/virmanager.sock',

    RUN_PATH: install_path + '/var/run',

    VIRM_RUN_PATH: install_path + '/var/run/virm',

    LOG_PATH: install_path + '/var/log',

    VIRM_CONF_PATH: install_path + '/virm/virm.conf'
};

export default CONF;
