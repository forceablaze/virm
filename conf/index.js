'use strict'

const NAME = 'DAMain';
const QPKG_CONF_PATH = '/etc/config/qpkg.conf';

import SubProcess from '../module/process';

const install_path =
    new SubProcess('/sbin/getcfg',
        [NAME, 'Install_Path', '-f', QPKG_CONF_PATH])
        .runSync().stdout.toString().trim();

const CONF = {
    INSTALL_PATH: install_path,

    BIN_PATH: install_path + '/usr/bin'
};

export default CONF;
