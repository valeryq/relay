/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails oncall+relay
 * @format
 */

'use strict';

require('configureForRelayOSS');

const RelayClassic = require('RelayClassic');
const RelayTestUtils = require('RelayTestUtils');

const intersectRelayQuery = require('intersectRelayQuery');

describe('intersectRelayQuery', () => {
  const {getNode} = RelayTestUtils;

  beforeEach(() => {
    expect.extend(RelayTestUtils.matchers);
  });

  describe('fields', () => {
    it('returns null for mutually exclusive nodes', () => {
      const subjectNode = getNode(
        RelayClassic.QL`
        fragment on Date {
          day
          month
        }
      `,
      );
      const patternNode = getNode(
        RelayClassic.QL`
        fragment on Date {
          year
        }
      `,
      );
      expect(intersectRelayQuery(subjectNode, patternNode)).toBe(null);
    });

    it('intersects shallow fields', () => {
      const subjectNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          name
          firstName
        }
      `,
      );
      const patternNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          lastName
          name
        }
      `,
      );
      const expected = getNode(
        RelayClassic.QL`
        fragment on Actor {
          name
        }
      `,
      );
      expect(intersectRelayQuery(subjectNode, patternNode)).toEqualQueryNode(
        expected,
      );
    });

    it('intersects nested fields', () => {
      const subjectNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          birthdate {
            day
            month
            year
          }
          hometown {
            name
            url
          }
        }
      `,
      );
      const patternNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          hometown {
            name
          }
          screennames {
            service
          }
        }
      `,
      );
      const expected = getNode(
        RelayClassic.QL`
        fragment on Actor {
          hometown {
            name
          }
        }
      `,
      );
      expect(intersectRelayQuery(subjectNode, patternNode)).toEqualQueryNode(
        expected,
      );
    });

    it('includes fields with different arguments', () => {
      const subjectNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          id
          url(site:"www")
        }
      `,
      );
      const patternNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          id
          url
        }
      `,
      );
      const expected = getNode(
        RelayClassic.QL`
        fragment on Actor {
          id
          url(site:"www")
        }
      `,
      );
      expect(intersectRelayQuery(subjectNode, patternNode)).toEqualQueryNode(
        expected,
      );
    });

    it('intersects aliased fields by storage key', () => {
      const subjectNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          name
          firstName
        }
      `,
      );
      const patternNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          name
          name: firstName
        }
      `,
      );
      const expected = getNode(
        RelayClassic.QL`
        fragment on Actor {
          name
          firstName
        }
      `,
      );
      expect(intersectRelayQuery(subjectNode, patternNode)).toEqualQueryNode(
        expected,
      );
    });

    it('includes all fields of fields without sub-fields', () => {
      const subjectNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          hometown {
            name
            url
          }
        }
      `,
      );
      const patternNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          hometown
        }
      `,
      );
      const expected = getNode(
        RelayClassic.QL`
        fragment on Actor {
          hometown {
            name
            url
          }
        }
      `,
      );
      expect(intersectRelayQuery(subjectNode, patternNode)).toEqualQueryNode(
        expected,
      );
    });
  });

  describe('ranges', () => {
    it('includes range fields for connections without sub-fields', () => {
      const subjectNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends(first: 10) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `,
      );
      const patternNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends
        }
      `,
      );
      const expected = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends(first: 10) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `,
      );
      expect(intersectRelayQuery(subjectNode, patternNode)).toEqualQueryNode(
        expected,
      );
    });

    it('includes non-range connection fields', () => {
      const subjectNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends(first: 10) {
            count
            edges {
              node {
                id
                friends
                name
              }
            }
          }
        }
      `,
      );
      const patternNode = getNode(
        RelayClassic.QL`
        fragment on Actor @relay(pattern: true) {
          friends {
            count
          }
        }
      `,
      );
      const expected = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends(first: 10) {
            count
          }
        }
      `,
      );
      expect(intersectRelayQuery(subjectNode, patternNode)).toEqualQueryNode(
        expected,
      );
    });

    it('excludes filtered unterminated ranges', () => {
      const subjectNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends(first: 10) {
            count
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `,
      );
      const patternNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends
        }
      `,
      );
      const expected = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends(first: 10) {
            count
          }
        }
      `,
      );
      const filterUnterminatedRange = function(node) {
        return node.getSchemaName() === 'friends';
      };
      expect(
        intersectRelayQuery(subjectNode, patternNode, filterUnterminatedRange),
      ).toEqualQueryNode(expected);
    });

    it('excludes filtered unterminated ranges with different arguments', () => {
      const subjectNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends(orderby:"name",first: 10) {
            count
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `,
      );
      const patternNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends
        }
      `,
      );
      const expected = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends(orderby:"name",first: 10) {
            count
          }
        }
      `,
      );
      const filterUnterminatedRange = function(node) {
        return node.getSchemaName() === 'friends';
      };
      expect(
        intersectRelayQuery(subjectNode, patternNode, filterUnterminatedRange),
      ).toEqualQueryNode(expected);
    });

    it('does not exclude ranges from connections with sub-fields', () => {
      const subjectNode = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends(first: 10) {
            count
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `,
      );
      const patternNode = getNode(
        RelayClassic.QL`
        fragment on Actor @relay(pattern: true) {
          friends {
            count
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `,
      );
      const expected = getNode(
        RelayClassic.QL`
        fragment on Actor {
          friends(first: 10) {
            count
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `,
      );
      const filterUnterminatedRange = jest.fn();
      expect(
        intersectRelayQuery(subjectNode, patternNode, filterUnterminatedRange),
      ).toEqualQueryNode(expected);
      expect(filterUnterminatedRange).not.toBeCalled();
    });
  });
});
