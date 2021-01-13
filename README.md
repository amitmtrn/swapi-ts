# swapi-ts

## Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Usage](#usage)
- [Contributing](../CONTRIBUTING.md)

## About <a name = "about"></a>

This is a wrapper for the swapi.dev website

## Getting Started <a name = "getting_started"></a>

There are few collection that can hold (Resources)

```
SWApi.Films
SWApi.People
SWApi.Planets
SWApi.Species
SWApi.Starships
SWApi.Vehicles
```

you can query by `find(predicate)` which goes through all the pages and filter or use `findBySearch([search_term])` which use the search url query

```
  SWApi.Planets.findBySearch(['Tatooine'])
```

every collection have `resources` which are of the `Resources` class
and they have a value which contains the data queried  from the server

you can also use the `populateAll(path)` method which replace the string \ string[] with the related object

all the information is cached in the local storage

### Installing

`npm i swapi-ts`

## Usage <a name = "usage"></a>

```
    SWApi.Planets.findBySearch(['Tatooine', 'Alderaan', 'Naboo', 'Bespin', 'Endor'])
      .then(planets => _.map(planets.resources, planet => ({text: planet.value.name, value: parseInt(planet.value.population)})))

    SWApi.Vehicles.find(vehicle => vehicle.pilots.length > 0)
      .then(vehicles => vehicles.populateAll('pilots'))
      .then(vehicles => vehicles.populateAll('pilots.homeworld'))
      .then(vehicles => _.filter(vehicles.resources, vehicle => _.every(vehicle.value.pilots, (pilot => _.get(pilot, 'homeworld.population') !== 'unknown'))))
      .then(vehicles => _.map(vehicles, vehicle => ({
        name: vehicle.value.name,
        pilots: _.map(vehicle.value.pilots as SWApi.IPeople[], 'name'),
        population: _.map(vehicle.value.pilots, (pilot => ({name: _.get(pilot, 'homeworld.name'), population: _.get(pilot, 'homeworld.population')}))),
        get populationSum() {
          return _.sumBy(this.population, p => parseInt(p.population))
        }
      })))
      .then(vehicles => _.reverse(_.sortBy(vehicles, vehicle => vehicle.populationSum)))
```