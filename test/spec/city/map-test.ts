'use strict';

import ko = require("knockout");
import _ = require("lodash");

import Map = require("app/scripts/city/map");

import Cell = require("app/scripts/city/cell");
import CellType = require("app/scripts/city/cell-type");

import Coord = require("app/scripts/city/coord");
import Direction = require("app/scripts/city/direction");
import BasicHouse = require("app/scripts/city/buildings/basic-house");
import serialization = require("app/scripts/city/city-serialization");

function buildCell(x, y) {
  return new Cell(new Coord(x, y), CellType.Grass);
}

function cellData(x, y): serialization.CellData {
  return { coord: { x: x, y: y }, cellType: CellType.Grass };
}

function cellFactory(coord) {
  return buildCell(coord.x, coord.y);
}

function lexicographicSort(coordA, coordB) {
  // Handle sorting both coords and cells
  if (coordA.coord && coordB.coord) {
    return lexicographicSort(coordA.coord, coordB.coord);
  }

  if (coordA.x !== coordB.x) {
    return coordA.x > coordB.x ? 1 : -1;
  } else if (coordA.y !== coordB.y) {
    return coordA.y > coordB.y ? 1 : -1;
  } else {
    return 0;
  }
}

function c(x, y) {
  return new Coord(x, y);
}

function toCells(coordArraysArray) {
  return coordArraysArray.map(function (coord) {
    return new Cell(coord, CellType.Grass);
  });
}

describe('Map', () => {
  it('should default to a single empty cell', () => {
    var map = new Map(cellFactory);

    expect(map.getCells()).to.deep.equal([buildCell(0, 0)]);
  });

  it("should allow you to add a building", () => {
    var building = new BasicHouse(c(0, 0), Direction.South);
    var map = new Map(cellFactory);

    map.construct(building);

    expect(map.getBuildings()).to.deep.equal([building]);
  });

  it("should not allow you to add a building in a non-empty space", () => {
    var building = new BasicHouse(c(0, 0), Direction.South);
    var map = new Map(cellFactory);

    map.construct(building);
    expect(() => map.construct(building)).to.throw();
  });

  it("should let you remove a building", () => {
    var building = new BasicHouse(c(0, 0), Direction.South);
    var map = new Map(cellFactory);

    map.construct(building);
    map.remove(building);

    expect(map.getBuildings()).to.deep.equal([]);
  });

  it("should reject constructions on cells that don't exist", () => {
    var map = new Map(cellFactory);

    expect(() => map.construct(new BasicHouse(c(1, 0), Direction.South))).to.throw();
  });

  it("should reject removing buildings that don't exist", () => {
    var building = new BasicHouse(c(0, 0), Direction.South);
    var map = new Map(cellFactory);

    map.construct(building);
    map.remove(building);

    expect(() => map.remove(building)).to.throw();
  });

  it("should allow building remove on equality, not identity", () => {
    var map = new Map(cellFactory);

    map.construct(new BasicHouse(c(0, 0), Direction.South));
    map.remove(new BasicHouse(c(0, 0), Direction.South));

    expect(map.getBuildings()).to.deep.equal([]);
  });

  it("should reject removing buildings that don't quite match", () => {
    var map = new Map(cellFactory);

    map.construct(new BasicHouse(c(0, 0), Direction.South));

    expect(() => map.remove(new BasicHouse(c(1, 0), Direction.South))).to.throw();
  });

  it("should add new cells from the cell factory when a building as added surrounded by space", () => {
    var map = new Map(cellFactory);

    map.construct(new BasicHouse(c(0, 0), Direction.South));

    var coords = _.pluck(map.getCells(), 'coord');
    expect(coords.sort(lexicographicSort)).to.deep.equal([
      c(-1, -1), c(0, -1), c(1, -1),
      c(-1, 0),  c(0, 0),  c(1, 0),
      c(-1, 1),  c(0, 1),  c(1, 1)
    ].sort(lexicographicSort));
  });

  it("should add new cells from the cell factory when a building as added at the edge", () => {
    var initialCoords = [c(0, 0), c(1, 0), c(2, 0), c(1, 1)];
    var map = Map.deserialize({ cells: toCells(initialCoords), buildings: [] }, cellFactory);

    map.construct(new BasicHouse(c(1, 1), Direction.South));

    var coords = _.pluck(map.getCells(), 'coord');
    expect(coords.sort(lexicographicSort)).to.deep.equal(initialCoords.concat([
      c(0, 1),          c(2, 1),
      c(0, 2), c(1, 2), c(2, 2)
    ]).sort(lexicographicSort));
  });

  it("should serialize all its cells", () => {
    var map = new Map(cellFactory);
    map.construct(new BasicHouse(c(0, 0), Direction.South));

    var serialized = map.serialize();

    expect(serialized.cells.sort(lexicographicSort)).to.deep.equal([
      cellData(-1, -1), cellData(0, -1), cellData(1, -1),
      cellData(-1, 0),  cellData(0, 0),  cellData(1, 0),
      cellData(-1, 1),  cellData(0, 1),  cellData(1, 1)
    ].sort(lexicographicSort));
  });

  it("should serialize its buildings", () => {
    var map = new Map(cellFactory);
    var building1 = new BasicHouse(c(0, 0), Direction.South);
    var building2 = new BasicHouse(c(0, 1), Direction.South);

    map.construct(building1);
    map.construct(building2);
    var serialized = map.serialize();

    expect(serialized.buildings).to.deep.equal([
      { coords: [{x: 0, y: 0}], buildingType: 0, direction: 2 },
      { coords: [{x: 0, y: 1}], buildingType: 0, direction: 2 },
    ]);
  });

  it('should deserialize itself from provided data', () => {
    var map = Map.deserialize({ cells: [cellData(0, 0)], buildings: [] }, cellFactory);

    expect(map.getCells()).to.deep.equal([buildCell(0, 0)]);
  });

  it("should be unchanged after serialization and deserialization", () => {
    var map = new Map(cellFactory);
    map.construct(new BasicHouse(c(0, 0), Direction.South));
    map.construct(new BasicHouse(c(1, 0), Direction.South));
    var serialized = map.serialize();

    var newMap = Map.deserialize(serialized, cellFactory);

    expect(newMap.getCells()).to.deep.equal(map.getCells());
    expect(newMap.getBuildings()).to.deep.equal(map.getBuildings());
  });

  it("should throw if the cells provided have duplicates", () => {
    expect(() => {
      Map.deserialize({ cells: [buildCell(0, 0), buildCell(0, 0)], buildings: [] },
                      cellFactory);
    }).to.throw();
  });

  it("should successfully look up buildings by position", () => {
    var map = new Map(cellFactory);
    var building = new BasicHouse(c(0, 0), Direction.South);
    map.construct(building);

    var lookedUpBuilding = map.getBuildingAt(c(0, 0));

    expect(lookedUpBuilding).to.deep.equal(building);
  });

  it("should return undefined when looking up buildings in empty cells", () => {
    var map = new Map(cellFactory);
    var building = new BasicHouse(c(0, 0), Direction.South);
    map.construct(building);

    var lookedUpBuilding = map.getBuildingAt(c(1, 0));

    expect(lookedUpBuilding).to.be.undefined;
  });
});