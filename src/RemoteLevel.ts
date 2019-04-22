import { AbstractLevelDOWN, AbstractIterator } from 'abstract-leveldown';
import { ItemStore } from './Common';

const getIteratorUid = createIndex("db/itr/", 20);
const getCallbackUid = createIndex("db/cbs/", 20)

function RPC(that, target, method, args, callback?) {
    const id = getCallbackUid()
    if (callback) {
        that.cbstore.set(id, callback) 
        callback = { id }  
    }
    that.socket.write({ target, method, args, callback });
}

/**
 * AbstractLevelDOWN-complient implementation that forwards request to a remote leveldb
 * database through any Duplex binary stream. On the opposite side there is an adaptor,
 * that provides streaming interface.
 */
export class RemoteLevel extends AbstractLevelDOWN {

    public cbstore = new ItemStore()
   

    private _open  (            opts, cb) { RPC(this, "db",   "open", [             opts ], cb) }
    private _close (                  cb) { RPC(this, "db",  "close", [                  ], cb) }

    private _put   (key, value, opts, cb) { RPC(this, "db",   "_put", [ key, value, opts ], cb) }
    private _get   (key,        opts, cb) { RPC(this, "db",   "_get", [ key,        opts ], cb) }
    private _del   (key,        opts, cb) { RPC(this, "db",   "_del", [ key,        opts ], cb) }
    private _batch (operations, opts, cb) { RPC(this, "db", "_batch", [ operations, opts ], cb) }
    
    private _iterator(opts) { 
        return new RemoteIterator(this, opts); 
    }

    constructor (public socket) {
        super()
        const cbstore = this.cbstore;

        socket.on("readable", function () {
            var data; while (data = this.read()) {
                const cb = cbstore.take(data.id)
                if (cb) cb(data.error, ...data.result)
            }
        })
    }
}

/**
 * AbstractLevelDOWN-complient Iterator implementation.
 * 
 * Because creating iterators would, in general case, result in object creation in a 
 * separate process, we must enumerate them so they can be referenced. The adaptor 
 * on the remote database manages them and mirrors actions done on the local ones.
 */
export class RemoteIterator extends AbstractIterator {

    public id = getIteratorUid();
    public db: RemoteLevel;

    constructor (db: RemoteLevel, opts) {
        super(db);  
        RPC(db, "db", "_iterator", [ opts, this.id ]);
    }

    private _seek (key) { RPC(this.db, this.id, "_seek", [ key ]     ) }
    private _next (cb)  { RPC(this.db, this.id, "_next", [     ], cb ) }
    private _end  (cb)  { RPC(this.db, this.id, "_end" , [     ], cb ) }
}



enum LevelDBInstanceTypes {
    NOTLEVEL = 0,
    DATABASE = 1, 
    ITERATOR = 2
}

function getLevelDbInstanceType(object): LevelDBInstanceTypes {
    if (object instanceof AbstractLevelDOWN) return LevelDBInstanceTypes.DATABASE;
    if (object instanceof AbstractIterator)  return LevelDBInstanceTypes.ITERATOR;
    return LevelDBInstanceTypes.NOTLEVEL;
}


const A = "0123456789ABCDEF";

function toHex(integer: number) {
    const l =  integer    % 16;
    const h = (integer - l)/16;
    return A[h] + A[l]
}

export function createIndex(prefix = "", bytes: number) {
    const array = []
    while (array.length < bytes) array.push(0);
    
    return function () {
        let i = bytes;
        while (--i >= 0) {
            if (++array[i] < 256) break;
            array[i] = 0;
        }
        return prefix + array.map(toHex).join("")
    }
}
