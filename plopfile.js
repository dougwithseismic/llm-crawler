module.exports = function (plop) {
  // Add the lowercase helper
  plop.setHelper('lowercase', function (str) {
    return str.toLowerCase();
  });

  // Load your existing generators here

  // Add the new scraper generator
  require('./plop-templates/scraper-generator')(plop);
};
