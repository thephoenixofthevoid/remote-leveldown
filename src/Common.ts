import Duplexify from 'duplexify';
import DuplexPair from 'native-duplexpair';
import { Duplex } from 'stream';
import Msgpack from "msgpack5"

export const pack = Msgpack()

const encodeError = e  => {
    console.log("Encoded error")
    return pack.encode({ 
      message: e.message, 
      notFound: e.notFound, 
      status: e.status, 
      name: e.name 
    })
}

const decodeError = buffer => {
    const { message, notFound, status, name } = pack.decode(buffer)
    const error: any = new Error(message);
    if (notFound) error.notFound = notFound;
    if (name)     error.name = name;
    if (status)   error.status = status;
    return error
}

pack.register(1, Error, encodeError, decodeError)


export function upgrade(connection: Duplex) {
    var encoder = pack.encoder()
    var decoder = pack.decoder()
    encoder.pipe(connection).pipe(decoder)
    return Duplexify.obj(encoder, decoder)
}

const p = new DuplexPair()
export const socket = upgrade(p.socket1)
export const remote = upgrade(p.socket2)


/**
 * Manages callbacks
 * 
 * TODO: Timeouts
 */
export class ItemStore {

    public store = new Map();

    constructor (private getUid?) {}

    public put(cb) {
        if (!this.getUid) throw new Error("Need getUid to use put")
        const id = this.getUid();
        this.store.set(id, cb);
        return id;
    }

    public take(id:string) {
        const cb = this.store.get(id);
        this.store.delete(id);
        return cb;
    }
    
    public get(id:string) {
        return this.store.get(id);;
    }

    public set(id:string, it: any) {
        this.store.set(id, it);
    }
}



