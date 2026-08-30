function issue(path, message) {
  return { path: Array.isArray(path) ? path : [path], message };
}

function ok(data) {
  return { success: true, data };
}

function fail(issues) {
  return { success: false, error: { issues } };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isEmail(value) {
  return typeof value === 'string'
    && value.length <= 255
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function optional(data, key, validator, output, issues) {
  if (data[key] !== undefined) validator(data[key], [key], output, issues);
}

function required(data, key, validator, output, issues, message) {
  if (data[key] === undefined) {
    issues.push(issue(key, message || `${key} obrigatorio`));
    return;
  }
  validator(data[key], [key], output, issues);
}

function stringValidator({ min = 0, max = Infinity, trim = false, message = 'Valor invalido' } = {}) {
  return (value, path, output, issues) => {
    if (typeof value !== 'string') {
      issues.push(issue(path, message));
      return;
    }
    const normalized = trim ? value.trim() : value;
    if (normalized.length < min || normalized.length > max) {
      issues.push(issue(path, message));
      return;
    }
    output[path[path.length - 1]] = normalized;
  };
}

function numberValidator({ int = false, min = -Infinity, max = Infinity, message = 'Numero invalido' } = {}) {
  return (value, path, output, issues) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || (int && !Number.isInteger(value)) || value < min || value > max) {
      issues.push(issue(path, message));
      return;
    }
    output[path[path.length - 1]] = value;
  };
}

function booleanValidator(value, path, output, issues) {
  if (typeof value !== 'boolean') {
    issues.push(issue(path, 'Booleano invalido'));
    return;
  }
  output[path[path.length - 1]] = value;
}

function enumValidator(values, message = 'Opcao invalida') {
  return (value, path, output, issues) => {
    if (!values.includes(value)) {
      issues.push(issue(path, message));
      return;
    }
    output[path[path.length - 1]] = value;
  };
}

function arrayValidator(itemValidator, { min = 0, max = Infinity, message = 'Lista invalida' } = {}) {
  return (value, path, output, issues) => {
    if (!Array.isArray(value) || value.length < min || value.length > max) {
      issues.push(issue(path, message));
      return;
    }

    const parsed = [];
    value.forEach((item, index) => {
      const itemOutput = {};
      const before = issues.length;
      itemValidator(item, [...path, index], itemOutput, issues);
      if (issues.length === before) parsed.push(itemOutput.value ?? itemOutput[index] ?? item);
    });
    output[path[path.length - 1]] = parsed;
  };
}

function passthroughObjectValidator(shape = {}) {
  return (value, path, output, issues) => {
    if (!isPlainObject(value)) {
      issues.push(issue(path, 'Objeto invalido'));
      return;
    }

    const parsed = { ...value };
    for (const [key, validator] of Object.entries(shape)) {
      if (value[key] !== undefined) {
        const fieldOutput = {};
        const before = issues.length;
        validator(value[key], [...path, key], fieldOutput, issues);
        if (issues.length === before) parsed[key] = fieldOutput[key];
      }
    }
    output.value = parsed;
  };
}

function unionValidator(validators, message = 'Valor invalido') {
  return (value, path, output, issues) => {
    for (const validator of validators) {
      const attemptOutput = {};
      const attemptIssues = [];
      validator(value, path, attemptOutput, attemptIssues);
      if (!attemptIssues.length) {
        output.value = attemptOutput.value ?? attemptOutput[path[path.length - 1]] ?? value;
        return;
      }
    }
    issues.push(issue(path, message));
  };
}

function objectSchema(validate) {
  return {
    safeParse(input) {
      if (!isPlainObject(input)) return fail([issue('', 'Objeto invalido')]);
      const output = {};
      const issues = [];
      validate(input, output, issues);
      return issues.length ? fail(issues) : ok(output);
    }
  };
}

const emailValidator = (value, path, output, issues) => {
  if (!isEmail(value)) {
    issues.push(issue(path, 'Email invalido'));
    return;
  }
  output[path[path.length - 1]] = value;
};

const passwordValidator = stringValidator({ min: 6, max: 128, message: 'Senha deve ter pelo menos 6 caracteres' });
const nameValidator = stringValidator({ min: 1, max: 100, trim: true, message: 'Nome obrigatorio' });
const englishLevelValidator = enumValidator(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const roleValidator = enumValidator(['system', 'user', 'assistant', 'function']);
const topicValidator = enumValidator(['restaurant', 'airport', 'job_interview', 'small_talk', 'shopping']);

const favoriteValidator = unionValidator([
  (value, path, output, issues) => {
    if (typeof value !== 'string') issues.push(issue(path, 'Favorito invalido'));
    else output.value = value;
  },
  passthroughObjectValidator({
    key: stringValidator({ max: 200 }),
    title: stringValidator({ max: 200 }),
    artist: stringValidator({ max: 200 }),
    ytId: stringValidator({ max: 50 }),
    level: stringValidator({ max: 50 })
  })
], 'Favorito invalido');

const chatContentValidator = unionValidator([
  (value, path, output, issues) => {
    if (typeof value !== 'string') issues.push(issue(path, 'Conteudo invalido'));
    else output.value = value;
  },
  arrayValidator(passthroughObjectValidator({
    type: enumValidator(['text', 'image_url']),
    text: stringValidator(),
    image_url: passthroughObjectValidator({ url: stringValidator({ min: 1 }) })
  }))
], 'Conteudo invalido');

const messageValidator = passthroughObjectValidator({
  role: roleValidator,
  content: chatContentValidator
});

const registerSchema = objectSchema((data, output, issues) => {
  required(data, 'name', nameValidator, output, issues, 'Nome obrigatorio');
  required(data, 'email', emailValidator, output, issues, 'Email obrigatorio');
  required(data, 'password', passwordValidator, output, issues, 'Senha obrigatoria');
});

const loginSchema = objectSchema((data, output, issues) => {
  required(data, 'email', emailValidator, output, issues, 'Email obrigatorio');
  required(data, 'password', stringValidator({ min: 1, message: 'Senha obrigatoria' }), output, issues, 'Senha obrigatoria');
});

const changePasswordSchema = objectSchema((data, output, issues) => {
  required(data, 'currentPassword', stringValidator({ min: 1, message: 'Senha atual obrigatoria' }), output, issues, 'Senha atual obrigatoria');
  required(data, 'newPassword', passwordValidator, output, issues, 'Nova senha obrigatoria');
});

const resetPasswordSchema = objectSchema((data, output, issues) => {
  required(data, 'token', stringValidator({ min: 1, message: 'Token obrigatorio' }), output, issues, 'Token obrigatorio');
  required(data, 'newPassword', passwordValidator, output, issues, 'Nova senha obrigatoria');
});

const forgotPasswordSchema = objectSchema((data, output, issues) => {
  required(data, 'email', emailValidator, output, issues, 'Email obrigatorio');
});

const profileUpdateSchema = objectSchema((data, output, issues) => {
  optional(data, 'name', nameValidator, output, issues);
  optional(data, 'level', numberValidator({ int: true, min: 1, max: 99 }), output, issues);
  optional(data, 'xp', numberValidator({ int: true, min: 0 }), output, issues);
  optional(data, 'streak', numberValidator({ int: true, min: 0 }), output, issues);
  optional(data, 'correct_answers', numberValidator({ int: true, min: 0 }), output, issues);
  optional(data, 'lessons_completed', numberValidator({ int: true, min: 0 }), output, issues);
  optional(data, 'english_level', englishLevelValidator, output, issues);
  optional(data, 'placement_completed', numberValidator({ int: true, min: 0, max: 1 }), output, issues);
  optional(data, 'achievements', arrayValidator(stringValidator({ min: 1, max: 200 })), output, issues);
  optional(data, 'favorites', arrayValidator(favoriteValidator), output, issues);
  optional(data, 'theme', stringValidator({ max: 50 }), output, issues);
});

const subscriptionCreateSchema = objectSchema((data, output, issues) => {
  required(data, 'plan', enumValidator(['monthly']), output, issues, 'Plano obrigatorio');
});

const shopBuySchema = objectSchema((data, output, issues) => {
  required(data, 'itemId', stringValidator({ min: 1, message: 'Item ID obrigatorio' }), output, issues, 'Item ID obrigatorio');
});

const flashcardReviewSchema = objectSchema((data, output, issues) => {
  required(data, 'word', stringValidator({ min: 1, max: 100, message: 'Word obrigatoria' }), output, issues, 'Word obrigatoria');
  optional(data, 'translation', stringValidator({ max: 500 }), output, issues);
  required(data, 'quality', numberValidator({ int: true, min: 0, max: 5, message: 'Quality deve ser 0-5' }), output, issues, 'Quality obrigatoria');
});

const conversationSchema = objectSchema((data, output, issues) => {
  required(data, 'topicId', topicValidator, output, issues, 'Topico obrigatorio');
  required(data, 'message', stringValidator({ min: 1, max: 2000, message: 'Mensagem obrigatoria' }), output, issues, 'Mensagem obrigatoria');
  optional(data, 'history', arrayValidator(messageValidator, { max: 20 }), output, issues);
  optional(data, 'englishLevel', englishLevelValidator, output, issues);
});

const grammarAnalyzeSchema = objectSchema((data, output, issues) => {
  required(data, 'conversationHistory', arrayValidator(messageValidator, { min: 1, message: 'Historico obrigatorio' }), output, issues, 'Historico obrigatorio');
  optional(data, 'topicId', stringValidator({ max: 50 }), output, issues);
});

const pushSubscribeSchema = objectSchema((data, output, issues) => {
  required(data, 'endpoint', (value, path, out, list) => {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid');
      out[path[path.length - 1]] = value;
    } catch (_error) {
      list.push(issue(path, 'Endpoint invalido'));
    }
  }, output, issues, 'Endpoint obrigatorio');

  if (!isPlainObject(data.keys)) {
    issues.push(issue('keys', 'Keys obrigatorio'));
  } else {
    output.keys = {};
    required(data.keys, 'p256dh', stringValidator({ min: 1, message: 'p256dh obrigatorio' }), output.keys, issues, 'p256dh obrigatorio');
    required(data.keys, 'auth', stringValidator({ min: 1, message: 'auth obrigatorio' }), output.keys, issues, 'auth obrigatorio');
  }
});

const streakClaimSchema = objectSchema((data, output, issues) => {
  required(data, 'rewardId', stringValidator({ min: 1, message: 'Reward ID obrigatorio' }), output, issues, 'Reward ID obrigatorio');
});

const chatCompletionsSchema = objectSchema((data, output, issues) => {
  optional(data, 'model', stringValidator(), output, issues);
  required(data, 'messages', arrayValidator(messageValidator, { min: 1, message: 'Messages obrigatorio' }), output, issues, 'Messages obrigatorio');
  optional(data, 'temperature', numberValidator({ min: 0, max: 2 }), output, issues);
  optional(data, 'max_tokens', numberValidator({ int: true, min: 1, max: 32000 }), output, issues);
  optional(data, 'top_p', numberValidator({ min: 0, max: 1 }), output, issues);
  optional(data, 'stream', booleanValidator, output, issues);
  optional(data, 'stop', unionValidator([
    (value, path, out, list) => {
      if (typeof value !== 'string') list.push(issue(path, 'Stop invalido'));
      else out.value = value;
    },
    arrayValidator((value, path, out, list) => {
      if (typeof value !== 'string') list.push(issue(path, 'Stop invalido'));
      else out.value = value;
    })
  ]), output, issues);
});

const lyricsSearchSchema = objectSchema((data, output, issues) => {
  optional(data, 'artist_name', stringValidator({ max: 200 }), output, issues);
  required(data, 'track_name', stringValidator({ min: 1, max: 200, message: 'track_name obrigatorio' }), output, issues, 'track_name obrigatorio');
});

const translateSchema = objectSchema((data, output, issues) => {
  required(data, 'q', stringValidator({ min: 1, max: 500, message: 'Texto obrigatorio' }), output, issues, 'Texto obrigatorio');
  optional(data, 'from', stringValidator({ min: 2, max: 10 }), output, issues);
  optional(data, 'to', stringValidator({ min: 2, max: 10 }), output, issues);
});

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(e => ({
        field: e.path.filter(Boolean).join('.'),
        message: e.message
      }));
      return res.status(400).json({
        error: 'Dados invalidos',
        details: errors
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.issues.map(e => ({
        field: e.path.filter(Boolean).join('.'),
        message: e.message
      }));
      return res.status(400).json({
        error: 'Parametros invalidos',
        details: errors
      });
    }
    req.validatedQuery = result.data;
    next();
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
  profileUpdateSchema,
  subscriptionCreateSchema,
  shopBuySchema,
  flashcardReviewSchema,
  conversationSchema,
  grammarAnalyzeSchema,
  pushSubscribeSchema,
  streakClaimSchema,
  chatCompletionsSchema,
  lyricsSearchSchema,
  translateSchema,
  validateBody,
  validateQuery
};
