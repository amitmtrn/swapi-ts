import _ from 'lodash';

export interface IFilm {
  characters: string[] | IPeople[];
  created: Date;
  director: string;
  edited: Date;
  episode_id: string;
  opening_crawl: string;
  planets: string[] | IPlanet[];
  producer: string;
  release_date: Date;
  species: string[] | ISpecie[];
  starships: string[] | IStarship[];
  title: string;
  url: string;
  vehicles: string[] | IVehicle[];
}
export interface IPeople {
  birth_year: string;
  eye_color: string;
  films: string[] | IFilm[];
  gender: string;
  hair_color: string;
  height: string;
  homeworld: string | IPlanet;
  mass: string;
  name: string;
  skin_color: string;
  created: Date;
  edited: Date;
  species: string[] | ISpecie[];
  starships: string[] | IStarship[];
  url: string;
  vehicles: string[] | IVehicle[];
}
export interface IPlanet {
  climate: string;
  created: Date;
  diameter: string;
  edited: Date;
  films: string[] | IFilm[];
  gravity: string;
  name: string;
  orbital_period: string;
  population: string;
  residents: string[] | IPeople[];
  rotation_period: string;
  surface_water: string;
  terrain: string;
  url: string;
}
export interface ISpecie {
  average_height: string;
  average_lifespan: string;
  classification: string;
  created: Date;
  designation: string;
  edited: Date;
  eye_colors: string;
  hair_colors: string;
  homeworld: string | IPlanet;
  language: string;
  name: string;
  people: string[] | IPeople[];
  films: string[] | IFilm[];
  skin_colors: string;
  url: string;
}
export interface IStarship {
  MGLT: string;
  cargo_capacity: string;
  consumables: string;
  cost_in_credits: string;
  created: Date;
  crew: string;
  edited: Date;
  hyperdrive_rating: string;
  length: string;
  manufacturer: string;
  max_atmosphering_speed: string;
  model: string;
  name: string;
  passengers: string;
  films: string[] | IFilm[];
  pilots: string[] | IPeople[];
  starship_class: string;
  url: string;
}
export interface IVehicle {
  cargo_capacity: string;
  consumables: string;
  cost_in_credits: string;
  created: Date;
  crew: string;
  edited: Date;
  length: string;
  manufacturer: string;
  max_atmosphering_speed: string;
  model: string;
  name: string;
  passengers: string;
  pilots: string[] | IPeople[];
  films: string[] | IFilm[];
  url: string;
  vehicle_class: string;
}

export enum ResourcesType {
  Films = 'films',
    People = 'people',
    Planets = 'planets',
    Species = 'species',
    Starships = 'starships',
    Vehicles = 'vehicles',
}

const cache = window.localStorage;
const prefix = 'swCache'

async function request(url: string) {
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

class Resource < S > {
  constructor(public value: S) {}

  public async populate(path: string) {
    await this.populateRec(path, this.value);

    return this;
  }

  private async populateSingle(path: string, obj: any) {
    if (Array.isArray(obj[path])) {
      obj[path] = await Promise.all((obj[path] as string[]).map(url => request(url.replace('http:', 'https:'))));

      return this;
    }

    obj[path] = await request((obj[path] as string).replace('http:', 'https:'));

    return this;
  }

  private populateRec(path: string, obj: any): Promise < {} > {
    const [next, ...rest] = path.split('.');


    if (rest.length > 0 && Array.isArray(obj[next])) {
      return Promise.all(obj[next].map((single: any) => this.populateRec(rest.join('.'), single)));
    }

    if (rest.length === 0 && Array.isArray(obj)) {
      return Promise.all(obj.map(single => this.populateSingle(next, single)))
    } else if (rest.length === 0) {
      return this.populateSingle(next, obj);
    }


    return this.populateRec(rest.join('.'), obj[next] as {});
  }


}


function collectionBuilder < T > (resource: ResourcesType) {
  return class SWCollection {
    static root = `https://swapi.dev/api/${resource}/`;
    public resources: Resource < T > [] = [];

    constructor(unparsedResources: T[]) {
      this.resources = unparsedResources.map(resource => new Resource < T > (resource));
    }

    async populateAll(path: string) {
      this.resources = await Promise.all(this.resources.map(obj => obj.populate(path)))

      return this;
    }

    static getPage(page: number = 1, search ? : string) {
      if (search) {
        return request(`${SWCollection.root}?page=${page}&search=${search}`);
      }

      return request(`${SWCollection.root}?page=${page}`);
    }

    public static async find(predicate ? : (single: T) => boolean) {
      const {
        count,
        results: firstResult
      } = await SWCollection.getPage();
      const pages = Math.ceil(count / firstResult.length);
      const left = Array.from({
        length: (pages - 1)
      }, (_, i) => SWCollection.getPage(2 + i));
      const restResults = await Promise.all(left);

      const totalResults: T[] = [{
        results: firstResult
      }, ...restResults].reduce((allResults, {
        results
      }) => {
        return [...allResults, ...results];
      }, []);

      return new SWCollection(_.filter(totalResults, predicate));
    }

    public static async findBySearch(predicate: string[]) {
      const pages = await Promise.all(predicate.map(query => this.getPage(1, query)))

      return new SWCollection(_.flatMap(pages, 'results'));
    }

  }
}


export const Films = collectionBuilder < IFilm > (ResourcesType.Films);
export const People = collectionBuilder < IPeople > (ResourcesType.People);
export const Planets = collectionBuilder < IPlanet > (ResourcesType.Planets);
export const Species = collectionBuilder < ISpecie > (ResourcesType.Species);
export const Starships = collectionBuilder < IStarship > (ResourcesType.Starships);
export const Vehicles = collectionBuilder < IVehicle > (ResourcesType.Vehicles);