import { ItemStore } from './Common';

const iterators = new ItemStore()


export class LevelDBSession {   

    constructor(public db, public remote) {
        remote.on("readable", function() {
            var cmd = null;
            while (cmd = this.read()) {
                processRpcCommand(cmd, remote, db)   
            }
        })
    }

}


function processRpcCommand({ target, method, callback, args }, remote, db) {

    console.log( target, method, callback, args)

    var cb = null

    if (callback) {
        const id = callback.id
        cb = (error, ...result) => remote.write({ id, error, result });   
    }
    
    if (target.startsWith("db/itr")) switch (method) {
        case "_end":  {
            console.log(iterators.store.keys(), target)
            return iterators.take(target)._end(cb)
        }
        case "_next": return iterators.get(target)._next(cb)
        case "_seek": return iterators.get(target)._seek(args[0])
        default: throw new Error("Unknown")
    }

    if (method === "_iterator") {
        const [ options, id ] = args
        const it = db._iterator(...args)
        iterators.set(id, it)
        return 
    } 
    
    db[method](...args, cb)
}
