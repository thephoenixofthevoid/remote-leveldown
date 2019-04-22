import { RemoteLevel } from './RemoteLevel';
import { upgrade } from './Common';
import { LevelDBSession } from './ServerLevel';
import DuplexPair from 'native-duplexpair';

import LevelDown from "leveldown"
const tempy = require('tempy')
const suite = require('abstract-leveldown/test')
const {test} = require('tape')

var testCommon = suite.common({
    test: test,
    factory: function () {       
        const p = new DuplexPair()
        const socket = upgrade(p.socket1)
        const remote = upgrade(p.socket2)
        const db = new LevelDown(tempy.directory())
        const level: any = new RemoteLevel(socket)
        const store = new LevelDBSession(db, remote)
        return level
        // Need to disable "put-get-del-test.js" tests 
        // These require manual fixing
    }
});

suite(testCommon)
