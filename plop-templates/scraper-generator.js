module.exports = function (plop) {
  plop.setGenerator('scraper', {
    description: 'Create a new content scraper',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the name of your scraper? (e.g., example)',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/module/crawlers/{{kebabCase name}}/index.ts',
        templateFile: 'plop-templates/scraper-index.hbs',
      },
      {
        type: 'add',
        path: 'src/module/crawlers/{{kebabCase name}}/router.ts',
        templateFile: 'plop-templates/scraper-router.hbs',
      },
      {
        type: 'add',
        path: 'src/module/crawlers/{{kebabCase name}}/handlers/default-handler.ts',
        templateFile: 'plop-templates/scraper-default-handler.hbs',
      },
      {
        type: 'add',
        path: 'src/module/crawlers/{{kebabCase name}}/handlers/{{kebabCase name}}-page-handler.ts',
        templateFile: 'plop-templates/scraper-page-handler.hbs',
      },
      {
        type: 'add',
        path: 'src/module/crawlers/{{kebabCase name}}/services/scrape-{{kebabCase name}}-data.ts',
        templateFile: 'plop-templates/scraper-data-service.hbs',
      },
      {
        type: 'add',
        path: 'src/module/crawlers/{{kebabCase name}}/types/{{kebabCase name}}-data.ts',
        templateFile: 'plop-templates/scraper-data-type.hbs',
      },
    ],
  });
};
