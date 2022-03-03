module.exports = {
  extends: ['prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
      jsx: true,
      modules: true,
    },
  },
  settings: {
    'import/resolver': {
      webpack: {
        config: './webpack.config.js',
      },
    },
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    node: true,
    commonjs: true,
    es6: true,
  },
  root: true,
  plugins: ['react', 'react-hooks', '@typescript-eslint', 'eslint-plugin-prettier'],
  rules: {
    'for-direction': 'error',
    'getter-return': [
      'error',
      {
        allowImplicit: false,
      },
    ],
    'no-await-in-loop': 'off',
    'no-compare-neg-zero': 'error',
    'no-cond-assign': ['error', 'except-parens'],
    'no-console': 'off',
    'no-constant-condition': [
      'error',
      {
        checkLoops: false,
      },
    ],
    'no-control-regex': 'off',
    'no-debugger': 'error',
    'no-dupe-args': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-empty': [
      'error',
      {
        allowEmptyCatch: true,
      },
    ],
    'no-empty-character-class': 'error',
    'no-ex-assign': 'error',
    'no-extra-boolean-cast': 'error',
    'no-extra-parens': ['error', 'functions'],
    'no-extra-semi': 'error',
    'no-func-assign': 'error',
    'no-inner-declarations': ['warn', 'both'],
    'no-invalid-regexp': 'error',
    'no-irregular-whitespace': [
      'error',
      {
        skipStrings: true,
        skipComments: false,
        skipRegExps: true,
        skipTemplates: true,
      },
    ],
    'no-obj-calls': 'error',
    'no-prototype-builtins': 'off',
    'no-regex-spaces': 'error',
    'no-sparse-arrays': 'error',
    'no-template-curly-in-string': 'error',
    'no-unexpected-multiline': 'error',
    'no-unreachable': 'warn',
    'no-unsafe-finally': 'error',
    'no-unsafe-negation': 'error',
    'use-isnan': 'error',
    'valid-jsdoc': 'off',
    'valid-typeof': 'error',
    'accessor-pairs': [
      'error',
      {
        setWithoutGet: true,
        getWithoutSet: false,
      },
    ],
    'array-callback-return': 'warn',
    'block-scoped-var': 'error',
    'class-methods-use-this': 'off',
    complexity: [
      'warn',
      {
        max: 20,
      },
    ],
    'consistent-return': 'off',
    curly: ['warn', 'multi-line', 'consistent'],
    'default-case': ['warn', { commentPattern: '^no default$' }],
    'dot-location': ['error', 'property'],
    'dot-notation': ['warn', { allowKeywords: true }],
    eqeqeq: [
      'warn', // was "error"
      'always',
      {
        null: 'ignore',
      },
    ],
    'guard-for-in': 'warn', // was "error"
    'no-alert': 'off',
    'no-caller': 'error',
    'no-case-declarations': 'error',
    'no-div-regex': 'off',
    'no-else-return': ['warn', { allowElseIf: false }],
    'no-empty-pattern': 'error',
    'no-eq-null': 'off',
    'no-eval': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-extra-label': 'error',
    'no-fallthrough': 'error',
    'no-floating-decimal': 'error',
    'no-global-assign': 'error',
    'no-implicit-coercion': [
      'warn',
      {
        allow: ['!!'],
      },
    ],
    'no-implicit-globals': 'error',
    'no-implied-eval': 'error',
    'no-invalid-this': 'off',
    'no-iterator': 'error',
    'no-labels': 'error',
    'no-lone-blocks': 'error',
    'no-loop-func': 'error',
    'no-magic-numbers': 'off',
    'no-multi-spaces': [
      'error',
      {
        ignoreEOLComments: true,
        exceptions: {
          Property: true,
          BinaryExpression: false,
          VariableDeclarator: true,
          ImportDeclaration: true,
        },
      },
    ],
    'no-multi-str': 'error',
    'no-new': 'off',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-octal': 'error',
    'no-octal-escape': 'error',
    'no-param-reassign': 'warn',
    'no-proto': 'error',
    'no-restricted-properties': 'off',
    'no-return-assign': ['warn', 'always'],
    'no-return-await': 'warn',
    'no-script-url': 'error',
    'no-self-assign': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'warn',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': [
      'warn',
      {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      },
    ],
    'no-unused-labels': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-escape': 'off',
    'no-useless-return': 'off',
    'no-void': 'error',
    'no-warning-comments': 'off',
    'no-with': 'error',
    'prefer-promise-reject-errors': 'error',
    radix: 'warn',
    'require-await': 'off',
    'vars-on-top': 'off',
    'wrap-iife': [
      'error',
      'inside',
      {
        functionPrototypeMethods: true,
      },
    ],
    yoda: [
      'error',
      'never',
      {
        onlyEquality: true,
      },
    ],
    strict: ['error', 'never'],
    'init-declarations': 'off',
    'no-catch-shadow': 'off',
    'no-delete-var': 'error',
    'no-label-var': 'error',
    'no-restricted-globals': 'off',
    'no-shadow': 'off',
    'no-shadow-restricted-names': 'error',
    'no-undef-init': 'warn',
    'no-undefined': 'warn',
    'callback-return': 'off',
    'global-require': 'off',
    'handle-callback-err': 'error',
    'no-buffer-constructor': 'error',
    'no-mixed-requires': 'off',
    'no-new-require': 'error',
    'no-path-concat': 'error',
    'no-process-env': 'off',
    'no-process-exit': 'off',
    'no-restricted-modules': 'off',
    'no-sync': 'off',
    'array-bracket-newline': 'off',
    'array-bracket-spacing': ['error', 'never'],
    'array-element-newline': 'off',
    'block-spacing': ['error', 'always'],
    'brace-style': 'off',
    camelcase: 'off',
    'capitalized-comments': 'off',
    'comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'ignore',
      },
    ],
    'comma-spacing': [
      'error',
      {
        before: false,
        after: true,
      },
    ],
    'comma-style': ['error', 'last'],
    'computed-property-spacing': ['error', 'never'],
    'consistent-this': 'off',
    'eol-last': 'off',
    'func-name-matching': [
      'error',
      'always',
      {
        includeCommonJSModuleExports: false,
      },
    ],
    'func-names': 'off',
    'func-style': 'off',
    'id-blacklist': 'off',
    'id-length': 'off',
    'id-match': 'off',
    'jsx-quotes': ['error', 'prefer-double'],
    'key-spacing': [
      'error',
      {
        beforeColon: false,
        afterColon: true,
        mode: 'strict',
      },
    ],
    'keyword-spacing': [
      // was "error"
      'warn',
      {
        before: true,
        after: true,
      },
    ],
    'line-comment-position': 'off',
    'linebreak-style': 'off',
    'lines-around-comment': 'off',
    'max-depth': ['warn', 5],
    'max-len': 'off',
    'max-lines': 'off',
    'max-nested-callbacks': ['error', 3],
    'max-params': ['error', 7],
    'max-statements': 'off',
    'max-statements-per-line': 'off',
    'multiline-ternary': 'off',
    'new-cap': [
      'error',
      {
        newIsCap: true,
        capIsNew: false,
        properties: true,
      },
    ],
    'new-parens': 'error',
    'newline-per-chained-call': 'off',
    'no-array-constructor': 'error',
    'no-bitwise': 'off',
    'no-continue': 'off',
    'no-inline-comments': 'off',
    'no-lonely-if': 'off',
    'no-mixed-operators': 'off',
    'no-mixed-spaces-and-tabs': 'error',
    'no-multi-assign': 'off',
    'no-multiple-empty-lines': [
      'error',
      {
        max: 3,
        maxEOF: 1,
        maxBOF: 1,
      },
    ],
    'no-negated-condition': 'off',
    'no-nested-ternary': 'off',
    'no-new-object': 'error',
    'no-plusplus': 'off',
    'no-restricted-syntax': 'off',
    'no-tabs': 'warn',
    'no-ternary': 'off',
    'no-trailing-spaces': 'error',
    'no-underscore-dangle': 'off',
    'no-unneeded-ternary': 'off',
    'no-whitespace-before-property': 'error',
    'nonblock-statement-body-position': [
      'warn',
      'beside',
      {
        overrides: {
          while: 'below',
        },
      },
    ],
    'object-curly-newline': [
      'error',
      {
        multiline: true,
        consistent: true,
      },
    ],
    'object-curly-spacing': [
      'error',
      'always',
      {
        arraysInObjects: true,
        objectsInObjects: true,
      },
    ],
    'object-property-newline': 'off',
    'one-var': ['error', 'never'],
    'one-var-declaration-per-line': ['error', 'always'],
    'operator-assignment': 'off',
    'operator-linebreak': 'off',
    'padded-blocks': 'off',
    'padding-line-between-statements': 'off',
    'quote-props': 'off',
    quotes: [
      'error',
      'single',
      {
        avoidEscape: true,
        allowTemplateLiterals: true,
      },
    ],
    'require-jsdoc': 'off',
    semi: [
      'error',
      'always',
      {
        omitLastInOneLineBlock: true,
      },
    ],
    'semi-spacing': [
      'warn',
      {
        before: false,
        after: true,
      },
    ],
    'semi-style': ['error', 'last'],
    'sort-keys': 'off',
    'sort-vars': 'off',
    'space-before-blocks': ['error', 'always'],
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'ignore',
        named: 'never',
        asyncArrow: 'always',
      },
    ],
    'space-in-parens': ['error', 'never'],
    'space-infix-ops': 'error',
    'space-unary-ops': [
      'error',
      {
        words: true,
        nonwords: false,
      },
    ],
    'switch-colon-spacing': [
      'error',
      {
        after: true,
        before: false,
      },
    ],
    'template-tag-spacing': ['error', 'never'],
    'unicode-bom': ['error', 'never'],
    'wrap-regex': 'off',
    'arrow-parens': 'off',
    'arrow-spacing': [
      'error',
      {
        before: true,
        after: true,
      },
    ],
    'constructor-super': 'error',
    'generator-star-spacing': [
      'error',
      {
        before: false,
        after: false,
      },
    ],
    'no-class-assign': 'error',
    'no-confusing-arrow': [
      'warn',
      {
        allowParens: true,
      },
    ],
    'no-const-assign': 'error',
    'no-dupe-class-members': 'warn',
    'no-duplicate-imports': 'error',
    'no-new-symbol': 'error',
    'no-restricted-imports': 'off',
    'no-this-before-super': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-rename': 'error',
    'no-var': 'warn',
    'object-shorthand': 'off',
    'prefer-arrow-callback': 'off',
    'prefer-const': 'off',
    'prefer-destructuring': 'off',
    'prefer-numeric-literals': 'off',
    'prefer-rest-params': 'off',
    'prefer-spread': 'off',
    'prefer-template': 'warn',
    'require-yield': 'error',
    'rest-spread-spacing': ['error', 'never'],
    'sort-imports': 'off',
    'symbol-description': 'error',
    'template-curly-spacing': ['error', 'never'],
    'yield-star-spacing': ['error', 'after'],
    'no-unused-vars': 'off',
    'no-useless-constructor': 'off',
    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': 'warn', // was "error"
    '@typescript-eslint/no-useless-constructor': 'error',
    'no-undef': 'off',
    'spaced-comment': 'off',
    '@typescript-eslint/adjacent-overload-signatures': 'off',
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/member-delimiter-style': 'error',
    '@typescript-eslint/member-naming': 'off',
    '@typescript-eslint/member-ordering': 'warn', // was "error"
    '@typescript-eslint/no-angle-bracket-type-assertion': 'off',
    '@typescript-eslint/no-array-constructor': 'error',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-namespace': 'warn',
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/no-triple-slash-reference': 'off',
    '@typescript-eslint/no-type-alias': 'off',
    '@typescript-eslint/no-unused-vars': [
      // was "error"
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'all',
        ignoreRestSiblings: true,
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/prefer-namespace-keyword': 'off',
    '@typescript-eslint/type-annotation-spacing': 'error',
    // React
    'react/boolean-prop-naming': 'off',
    'react/default-props-match-prop-types': 'off',
    'react/display-name': 'off',
    'react/forbid-component-props': 'off',
    'react/forbid-elements': 'off',
    'react/forbid-prop-types': 'off',
    'react/forbid-foreign-prop-types': 'off',
    'react/no-array-index-key': 'off',
    'react/no-children-prop': 'error',
    'react/no-danger': 'off',
    'react/no-danger-with-children': 'error',
    'react/no-deprecated': 'error',
    'react/no-did-mount-set-state': 'off',
    'react/no-did-update-set-state': 'error',
    'react/no-direct-mutation-state': 'error',
    'react/no-find-dom-node': 'error',
    'react/no-is-mounted': 'error',
    'react/no-multi-comp': 'off',
    'react/no-redundant-should-component-update': 'error',
    'react/no-render-return-value': 'error',
    'react/no-set-state': 'off',
    'react/no-typos': 'error',
    'react/no-string-refs': 'error',
    'react/no-unescaped-entities': 'error',
    'react/no-unknown-property': 'error',
    'react/no-unused-prop-types': 'off',
    'react/no-unused-state': 'off',
    'react/no-will-update-set-state': 'error',
    'react/prefer-es6-class': ['error', 'always'],
    'react/prefer-stateless-function': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'error',
    'react/require-default-props': 'off',
    'react/require-optimization': 'off',
    'react/require-render-return': 'error',
    'react/self-closing-comp': 'off',
    'react/sort-prop-types': 'off',
    'react/style-prop-object': 'error',
    'react/void-dom-elements-no-children': 'error',
    'react/jsx-boolean-value': 'off',
    'react/jsx-closing-bracket-location': [
      'error',
      {
        nonEmpty: false,
        selfClosing: 'line-aligned',
      },
    ],
    'react/jsx-closing-tag-location': 'off',
    'react/jsx-curly-spacing': [
      'error',
      {
        when: 'never',
        attributes: {
          allowMultiline: true,
        },
        children: true,
        spacing: {
          objectLiterals: 'never',
        },
      },
    ],
    'react/jsx-equals-spacing': ['error', 'never'],
    'react/jsx-filename-extension': 'off',
    'react/jsx-first-prop-new-line': 'off',
    'react/jsx-handler-names': 'off',
    'react/jsx-indent-props': ['error', 2],
    'react/jsx-key': 'error',
    'react/jsx-max-props-per-line': 'off',
    'react/jsx-no-bind': 'off',
    'react/jsx-no-comment-textnodes': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-literals': 'off',
    'react/jsx-no-target-blank': 'off',
    'react/jsx-no-undef': 'error',
    'react/jsx-pascal-case': 'error',
    'react/jsx-sort-props': 'off',
    'react/jsx-tag-spacing': [
      'error',
      {
        closingSlash: 'never',
        beforeSelfClosing: 'always',
        afterOpening: 'never',
      },
    ],
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/jsx-wrap-multilines': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'react/sort-comp': 'off',
    // End React
    'no-use-before-define': 'off',
    'arrow-body-style': 'off',
    'no-redeclare': 'off',
    'prettier/prettier': 'error',
  },
};
