'use strict'

const vorpal = require('vorpal')();

import SubProcess from './module/process';
import Manager from './manager';

const network = require('network');
const cidrjs = require('cidr-js');
const ip = require('ip');

const { cidrize, getRandomIntInclusive } = require('./utils');

const manager = Manager.getInstance();
const WORKING_DIR = __dirname;

vorpal
    .command('list <category>', 'List category.')
    .alias('l')
    .action(function(args, cb) {
        manager.list(args.category);
        cb();
    });

vorpal
    .command('create <category>', 'Create item.')
    .option('--name <name>', 'Set the name.')
    .option('--uuid <uuid>', 'The UUID of device')
    .option('--path <path>', 'Set the path.')
    .option('--size <size>', 'Set the size (in byte).')
    .option('--busnum <size>', 'The busnum of PCI device "01:00.0".')
    .option('--net <net>', 'The route target.')
    .option('--mask <mask>', 'The netmask of the network.')
    .option('--gw <gw>', 'Route packets via a gateway.')
    .alias('c')
    .action(function(args, cb) {
        manager.create(args.category.toString(),
                args.options);
        cb();
    });

vorpal
    .command('vm add <category> <uuid>', 'Start a device <uuid> to vm.')
    .option('--uuid <uuid>', 'the uuid of vm.')
    .alias('a')
    .action(function(args, cb) {
        if(args.options.uuid !== undefined) {
            console.log("add " + args.category + " " + args.uuid +
                    " to vm " + args.options.uuid);
            manager.addDeviceToVM(args.options.uuid,
                    args.category,
                    args.uuid);
        }
        cb();
    });

vorpal
    .command('start <category> <uuid>', 'Start a device.')
    .alias('s')
    .action(function(args, cb) {
        if(args.uuid !== undefined)
            manager.start(args.category, args.uuid);
        cb();
    });

vorpal
    .command('stop <category> <uuid>', 'Stop a device.')
    .alias('S')
    .action(function(args, cb) {
        if(args.uuid !== undefined)
            manager.stop(args.category, args.uuid);
        cb();
    });

vorpal
    .command('agent <uuid>', 'Create a client to control specified vm.')
    .alias('A')
    .action(function(args, cb) {
        if(args.uuid !== undefined)
            manager.createAgent(args.uuid);
        cb();
    });

vorpal
    .command('create damain')
    .option('--addresses <addresses>', 'The address of PCI device')
    .action(function(args, cb) {
        manager.createDAMain(args.options.addresses);
        cb();
    });

vorpal
    .command('damain <uuid>')
    .action(function(args, cb) {
        network.get_active_interface((err, obj) => {
            if(!err) {
                /* get current cidr address */
                ip.subnet(obj.ip_address, obj.netmask);
                let maskSize = cidrize(obj.netmask);
                let cidraddr = obj.ip_address + '/' + maskSize;
                console.log('current active ip ' + cidraddr);

                let cidr = new cidrjs();
                let list = cidr.list(cidraddr);

                let addr = list[getRandomIntInclusive(0, list.length - 1)];
                while(addr == obj.ip_address)
                    addr = list[getRandomIntInclusive(0, list.length - 1)];

                cidraddr = addr + '/' + maskSize;
                console.log('set subnet ' + cidraddr + ' to damain');
                manager.startupDAMain(args.uuid, cidraddr);
            }
        });
        cb();
    });

vorpal
    .command('connect damain <uuid>')
    .action(function(args, cb) {
        manager.connectDAMain(args.uuid);
        cb();
    });

vorpal
    .command('disconnect damain <uuid>')
    .action(function(args, cb) {
        manager.disconnectDAMain(args.uuid);
        cb();
    });

vorpal
    .command('test <uuid>')
    .action(function(args, cb) {
        manager.test(args.uuid);
        cb();
    });

vorpal
    .delimiter('virmanager:')
    .show()
    .parse(process.argv);
