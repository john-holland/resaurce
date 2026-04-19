'use strict';

const { createRouteInterpreter, createDomainRouteMachine } = require('./createRouteInterpreter');
const { handleHr } = require('../../domains/hr/hrHandlers');
const { handleTax } = require('../../domains/tax/taxHandlers');
const { handleLegal } = require('../../domains/legal/legalHandlers');
const { handlePresence } = require('../../domains/presence/presenceHandlers');

let _interpreter;

function getResaurceRouteInterpreter() {
  if (!_interpreter) {
    _interpreter = createRouteInterpreter([
      {
        id: 'resaurce:hrHelp',
        prefixes: ['hr/'],
        machine: createDomainRouteMachine('resaurce:hrHelp', handleHr),
      },
      {
        id: 'resaurce:taxDocuments',
        prefixes: ['tax/'],
        machine: createDomainRouteMachine('resaurce:taxDocuments', handleTax),
      },
      {
        id: 'resaurce:legalDocument',
        prefixes: ['legal/'],
        machine: createDomainRouteMachine('resaurce:legalDocument', handleLegal),
      },
      {
        id: 'resaurce:presence',
        prefixes: ['presence/'],
        machine: createDomainRouteMachine('resaurce:presence', handlePresence),
      },
    ]);
  }
  return _interpreter;
}

module.exports = { getResaurceRouteInterpreter };
