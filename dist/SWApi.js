import _ from 'lodash';
export var ResourcesType;
(function (ResourcesType) {
    ResourcesType["Films"] = "films";
    ResourcesType["People"] = "people";
    ResourcesType["Planets"] = "planets";
    ResourcesType["Species"] = "species";
    ResourcesType["Starships"] = "starships";
    ResourcesType["Vehicles"] = "vehicles";
})(ResourcesType || (ResourcesType = {}));
const cache = window.localStorage;
const prefix = 'swCache';
async function request(url) {
    const cached = cache.getItem(`${prefix}.${url}`);
    if (cached) {
        return JSON.parse(cached);
    }
    const headers = {
        "headers": {
            "accept": "application/json"
        }
    };
    const result = await fetch(url, headers).then(res => res.json());
    cache.setItem(`${prefix}.${url}`, JSON.stringify(result));
    return result;
}
class Resource {
    constructor(value) {
        this.value = value;
    }
    async populate(path) {
        await this.populateRec(path, this.value);
        return this;
    }
    async populateSingle(path, obj) {
        if (Array.isArray(obj[path])) {
            obj[path] = await Promise.all(obj[path].map(url => request(url.replace('http', 'https'))));
            return this;
        }
        obj[path] = await request(obj[path].replace('http', 'https'));
        return this;
    }
    populateRec(path, obj) {
        const [next, ...rest] = path.split('.');
        if (rest.length > 0 && Array.isArray(obj[next])) {
            return Promise.all(obj[next].map((single) => this.populateRec(rest.join('.'), single)));
        }
        if (rest.length === 0 && Array.isArray(obj)) {
            return Promise.all(obj.map(single => this.populateSingle(next, single)));
        }
        else if (rest.length === 0) {
            return this.populateSingle(next, obj);
        }
        return this.populateRec(rest.join('.'), obj[next]);
    }
}
function collectionBuilder(resource) {
    var _a;
    return _a = class SWCollection {
            constructor(unparsedResources) {
                this.resources = [];
                this.resources = unparsedResources.map(resource => new Resource(resource));
            }
            async populateAll(path) {
                this.resources = await Promise.all(this.resources.map(obj => obj.populate(path)));
                return this;
            }
            static getPage(page = 1, search) {
                if (search) {
                    return request(`${SWCollection.root}?page=${page}&search=${search}`);
                }
                return request(`${SWCollection.root}?page=${page}`);
            }
            static async find(predicate) {
                const { count, results: firstResult } = await SWCollection.getPage();
                const pages = Math.ceil(count / firstResult.length);
                const left = Array.from({
                    length: (pages - 1)
                }, (_, i) => SWCollection.getPage(2 + i));
                const restResults = await Promise.all(left);
                const totalResults = [{
                        results: firstResult
                    }, ...restResults].reduce((allResults, { results }) => {
                    return [...allResults, ...results];
                }, []);
                return new SWCollection(_.filter(totalResults, predicate));
            }
            static async findBySearch(predicate) {
                const pages = await Promise.all(predicate.map(query => this.getPage(1, query)));
                return new SWCollection(_.flatMap(pages, 'results'));
            }
        },
        _a.root = `https://swapi.dev/api/${resource}/`,
        _a;
}
export const Films = collectionBuilder(ResourcesType.Films);
export const People = collectionBuilder(ResourcesType.People);
export const Planets = collectionBuilder(ResourcesType.Planets);
export const Species = collectionBuilder(ResourcesType.Species);
export const Starships = collectionBuilder(ResourcesType.Starships);
export const Vehicles = collectionBuilder(ResourcesType.Vehicles);
