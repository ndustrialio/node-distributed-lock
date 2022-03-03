const argumentLookup = /:[a-zA-z]+/g;

const convertNamedToPositional = (statement, replacements = {}) => {
  const positionalArguments = [];
  let newQuery = statement;
  let match;
  let positionalIndex = 1;
  while ((match = argumentLookup.exec(newQuery)) !== null) { // eslint-disable-line no-cond-assign
    const result = match[0];
    if (replacements[result.replace(':', '')]) {
      positionalArguments.push(replacements[result.replace(':', '')]);
      newQuery = newQuery.replace(result, `$${positionalIndex++}`);
    }
  }

  return {
    query: newQuery,
    positionalArguments
  };
};

module.exports = { convertNamedToPositional };
