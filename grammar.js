const PREC = {
  TERNARY: 0, // a?b:c
  OR: 1, // a||b
  AND: 2, // a&&b
  COMPARE: 3, // a==b a!=b a<b a>b a<=b a>=b  A eq B  A ne B
  BIT_OR: 4, // a|b a^b
  BIT_NOT: 5, // ~a
  BIT_AND: 6, // a&b
  SHIFT: 7, // << >>
  CONCAT: 8, // A.B
  PLUS: 9, // a+b a-b
  TIMES: 10, // a*b a/b a%b
  UNARY: 11, // -a +a !a $a |a|
  POWER: 12, // a**b a!
};
/*
* TODO: agregar comentarios, eliminar bugs y agregar strings,
* completar las partes de alta prioridad, agregar constantes de gnuplot,
* funciones de gnuplot, etc.
* agregar el uso de paréntesis en las expresiones
*/
module.exports = grammar({
  name: 'gnuplot',

  // extras: $ => [
    // $.comment,
  // ],

  inline: $ => [
    // $.string_literal
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$.label]
  ],

  rules: {
    source_file: $ => repeat($._statement),

    _statement: $ => choice(
      $._command,
      $._assignment,
      // $.macro // TODO: revisar
      $.if_statement,
      $.do_for_statement,
      $.while_statement,
    ),

    _command: $ => choice(
      // $.c_bind, // p. 64
      // $.c_exit // quit
      $.c_fit,
      $.c_plot, // plot, splot, replot
      // $.c_print // printerr
      // $.c_pwd
      // $.c_reset
      $.c_set, // set, unset, show
      // $.c_stats // PRIORIDAD
      // TODO: agregar los demás comandos
    ),

    //-------------------------------------------------------------------------
    c_set: $ => seq(
      choice(/se(t)?/, /uns(et)?/, /sh(ow)?/),
      $._argument_set_show,
      '\n'
    ),

    _argument_set_show: $ => choice(
      $.angles,
      $.arrow,
      $.border,
      $.boxwidth,
      $.boxdepth,
      $.color,
      $.colormap,
      $.colorsequence,
      $.clip,
      $.cntrlabel,
      $.cntrparam,
      $.colorbox,
      $.colornames,
      $.contour,
      $.cornerpoles,
      // $.dashtype,
      $.datafile,
      $.decimalsign,
      $.dgrid3d,
      // $.dummy,
      $.encoding,
      $.errorbars,
      $.fit,
      $.format,
      // $.grid,
      // $.hidden3d,
      // $.history,
      // $.isosamples, // PRIORIDAD
      // $.isosurface,
      $.isotropic,
      // $.jitter,
      $.key,
      $.label,
      // $.linetype,
      // $.link,
      // $.loadpath,
      // $.locale,
      $.logscale,
      // $.mapping,
      $.margin,
      $.micro, // NOTE: experimental p. 184
      $.minussign, // NOTE: experimental p. 184
      $.monochrome,
      $.mouse,
      $.multiplot,
      $.mtics,
      // $.nonlinear,
      // $.object,
      // $.offsets,
      // $.origin,
      $.output,
      $.overflow,
      // $.palette, // PRIORIDAD
      $.parametric,
      // $.paxis,
      // $.pixmap,
      // $.pm3d,
      // $.pointintervalbox,
      $.pointsize,
      $.polar,
      // $.print,
      // $.psdir,
      // $.range, // PRIORIDAD
      // $.raxis,
      // $.rgbmax,
      $.samples,
      $.size,
      // $.spiderplot,
      // $.style,
      $.surface,
      // $.table,
      $.terminal,
      // $.termoption, // PRIORIDAD
      $.theta,
      // $.tics, // PRIORIDAD
      // $.timestamp,
      // $.timefmt,
      // $.title,
      $.version,
      // $.vgrid,
      // $.view,
      // $.walls
    ),

    angles: $ => seq(/an(gles)?/, optional(choice('degrees', 'radians'))),

    arrow: $ => prec.left(2, seq(/ar(row)?/, optional(repeat1(
      choice(
        seq(optional($._expression),'from', field('from', $._expression), /(rto|to)/, field('to_rto', $._expression)),
        seq(optional($._expression),'from', field('from', $._expression), 'length', field('lenght', $._expression), 'angle',field('angle', $._expression )),
        seq($._expression, /(arrowstyle|as)/, $._expression ),
        seq($._expression, optional(/(nohead|head|backhead|heads)/),
          optional(seq( 'size', $._expression, ',', $._expression, optional(seq(',', $._expression)))),
          optional('fixed'),
          optional(/(filled|empty|nofilled|noborder)/),
          optional(/(front|back)/),
          optional(seq( /(linestyle|ls)/, $._expression )),
          optional(seq( /(linetype|lt)/, $._expression )),
          optional(seq( /(linewidth|lw)/, $._expression )),
          optional(seq( /(linecolor|lc)/, $._expression )),
          optional(seq( /(dashtype|dt)/, $._expression )),
        ),
      ),
    )))),

    border: $ => seq('border', optional(repeat1(
      choice(
        /(front|back|behind)/,
        seq(/(linestyle|ls)/, $._expression),
        seq(/(linetype|lt)/, $._expression),
        seq(/(linewidth|lw)/, $._expression),
        seq(/(linecolor|lc)/, $._expression),
        seq(/(dashtype|dt)/, $._expression),
        'polar',
      ),
    ))),

    boxwidth: $ => prec.left(2, seq('boxwidth', optional(repeat1(
      choice(
      field('width', $._expression),
      /(absolute|relative)/,
      ),
    )))),

    boxdepth: $ => prec.left(2, seq('boxdepth', optional(repeat1(
      choice(
        field('y_extent', $._expression),
        'square'
      )
    )))),

    color: $ => 'color',

    colormap: $ => prec.left(2, seq('colormap', optional(choice(
      seq('new', $._expression),
      seq($._expression, $.range_block)
    )))),

    colorsequence: $ => seq('colorsequence', optional(choice('default', 'classic', 'podo'))),

    clip: $ => seq('clip', optional(choice('points', 'one', 'two', 'radial'))),

    cntrlabel: $ => seq('cntrlabel', optional(repeat1(
      choice(
        seq('format', $._expression),
        seq('font', $._expression),
        seq('start', $._expression),
        seq('interval', $._expression),
        'onecolor',
      ),
    ))),

    cntrparam: $ => seq('cntrparam', optional(choice(
      'linear',
      'cubicspline',
      'bspline',
      seq('points', $._expression),
      seq('order', $._expression),
      seq('levels',
        choice(
          $._expression,
          prec.left(2, seq('auto', optional($._expression))),
          prec.left(2, seq('discrete', $._expression, repeat(seq(',', $._expression)))),
          prec.left(2, seq('incremental', $._expression, ',', $._expression, optional(seq(',', $._expression)))),
        ),
        optional(/((un)?sorted)/),
        optional(seq('firstlinetype', $._expression)),
      ),
    ))),

    colorbox: $ => seq('colorbox', optional(repeat1(
      choice(
        /(vertical|horizontal)/,
        /((no)?invert)/,
        /(default|user)/,
        /(front|back)/,
        choice(
          'noborder',
          'bdefault',
          seq('border', $._expression), //linestyle
        ),
        seq('cbtics', $._expression), //linestyle
      ),
    ))),

    colornames: $ => 'colornames',

    contour: $ => seq('contour', optional(choice('base', 'surface', 'both'))),

    cornerpoles: $ => 'cornerpoles',

    // dashtype: $ => seq('dashtype', optional(repeat1())),

    datafile: $ => prec.left(2, seq(/dataf(ile)?/, optional(
      choice(
        'columnheaders',
        'fortran',
        'nofpe_trap',
        seq('missing', choice($._expression, 'NaN')),  // string
        seq(/sep(arator)?/, choice('whitespace', 'tab', 'comma', $._expression)), // chars
        seq('commentschars', optional($._expression)), // string
        seq('binary', $._expression), // binary list pag 160
      )
    ))),

    decimalsign: $ => seq('decimalsign', choice($._expression, seq('locale', optional($._expression)))),

    dgrid3d: $ => seq('dgrid3d', repeat1( // p. 161
      choice(
        seq(field('rows', $._expression), optional(seq(',', field('cols', $._expression)))),
        choice(
          'splines',
          seq('qnorm', $._expression),
          seq(
            choice('gauss', 'cauchy', 'exp', 'box', 'hann'),
            optional('kdensity'),
            optional($._expression),
            optional(seq(',', $._expression)),
          )
        )
      )
    )),

    // dummy: $ =>

    encoding: $ => seq('encoding', choice(
        'default', /iso_8859_(1|15|2|9)/, /koi8(r|u)/, /cp(437|85(0|2)|950|125(0|1|2|4))/, 'sjis', 'utf8', 'locale'
    )),

    errorbars: $ => seq('errorbars', optional(choice('small', 'large', 'fullwidth', field('size', $._expression))), optional(choice('front', 'back')), optional($.line_properties)),

    fit: $ => seq('fit', repeat1(
      choice(
        choice('nolog', seq('logfile', choice($._expression, 'default'))),
        choice(/(no)?quiet/, 'results', 'brief', 'verbose'),
        choice(/(no)?errorvariables/),
        choice(/(no)?covariancevariables/),
        choice(/(no)?errorscaling/),
        choice(/(no)?prescale/),
        seq('maxiter', choice(field('value', $._expression), 'default')),
        seq('limit', choice(field('epsilon', $._expression), 'default')),
        seq('limit_abs', $._expression), // epsilon_abs
        seq('start-lambda', choice($._expression, 'default')),
        seq('lambda-factor', choice($._expression, 'default')),
        seq('script', optional(choice(field('command', $._expression), 'default'))),
        /v4|v5/
      )
    )),

    format: $ => seq('format', optional(/(x|y|xy|x2|y2|z|cb)/), field('fmt_str', $._expression), /(numeric|timedate|geographic)/ ),

    // grid: $ =>
    //
    // hidden3d: $ =>
    //
    // history: $ =>
    //
    // isosamples: $ =>
    //
    // isosurface: $ =>
    //
    isotropic: $ => 'isotropic',
    //
    // jitter: $ =>
    //
    key: $ => seq(/k(ey)?/, repeat1(
      choice(
        /(on|off)/,
        'default',
        /(no)?enhanced/,
        seq(/(no)?autotitle/, optional('columnheader')),
        seq(/(no)?box/, optional($.line_properties)),
        seq(/(no)?opaque/, optional(seq('fc', $._expression))), // colorspec
        seq('width', $._expression), // increment
        seq('height', $._expression), // increment
        // layout
        /(vertical|horizontal)/,
        seq('maxcols', optional(choice($._expression, 'auto'))),
        seq('maxrows', optional(choice($._expression, 'auto'))),
        seq('columns', $._expression),
        seq('keywidth', choice('screen', 'graph'), $._expression),
        /Left|Right/,
        /(no)?(reverse|invert)/,
        seq('samplen', field('length', $._expression)),
        seq('spacing', field('spacing', $._expression)),
        seq(/t(it)?(le)?/, optional($._expression), optional(/(no)?enhanced/), optional(/(c(enter)?|l(eft)?|r(ight)?)/)),
        seq('font', field('face_size', $._expression)),
        seq('textcolor', $._expression), // colorspec
        // placement
        /(inside|outside|fixed)/,
        /(l|r|t|b)m(argin)?/,
        seq('at', $.position),
        /l(eft)?|r(ight)?|c(enter)?/, /t(op)?|b(ottom)?|c(enter)?/,
      ),
    )),

    label: $ => seq(/(x|y|z|r|x2|y2|cb)?lab(el)?/, seq( // p. 168
      field('tag', optional($._expression)),
      field('text', optional($._expression)),
      optional(seq('at', $.position)),
      optional(/l(eft)?|r(ight)?|c(enter)?/),
      optional(choice('norotate', seq('rotate', optional(seq('by', field('degrees', $._expression)))))),
      optional(/front|back/),
      optional(seq('textcolor', $._expression)), // colorspec
      optional(choice(seq('point', field('point', $._expression)), 'nopoint')),
      optional(seq('offset', field('offset', $._expression))),
      optional(choice('nobox', seq('boxed', optional(field('bs', seq('bs', $._expression)))))),
      optional('hypertext'),
    )),
    //
    // linetype: $ =>
    //
    // link: $ =>
    //
    // loadpath: $ =>
    //
    // locale: $ =>
    //
    logscale: $ => seq('logscale', repeat(seq(/(x|y|z|x2|y2|cb|r)/, optional(field('base', $._expression))))),
    //
    // mapping: $ =>

    margin: $ => seq(/(b|l|t|r)?m(argin)?s?/, optional(choice(
      seq(optional('at screen'), $._expression),
      seq(field('lm', $._expression), ',', field('rm', $._expression), ',', field('bm', $._expression), ',', field('tm', $._expression)),
    ))),

    micro: $ => 'micro',

    minussign: $ => 'minussign',

    monochrome: $ => seq('monochrome',
      // {linetype N <linetype properties>}
    ), // NOTE: p. 185

    mouse: $ => seq('mouse',
      /*
      {doubleclick <ms>} {nodoubleclick}
      {{no}zoomcoordinates}
      {zoomfactors <xmultiplier>, <ymultiplier>}
      {noruler | ruler {at x,y}}
      {polardistance{deg|tan} | nopolardistance}
      {format <string>}
      {mouseformat <int> | <string> | function <f(x,y)>}
      {{no}labels {"labeloptions"}}
      {{no}zoomjump} {{no}verbose}
       */
    ),

    multiplot: $ => seq('multiplot',
      /*
      { title <page title> {font <fontspec>} {enhanced|noenhanced} }
      { layout <rows>,<cols>
        {rowsfirst|columnsfirst} {downwards|upwards}
        {scale <xscale>{,<yscale>}} {offset <xoff>{,<yoff>}}
        {margins <left>,<right>,<bottom>,<top>}
        {spacing <xspacing>{,<yspacing>}}
      }
      {next|previous}
      */
    ),

    mtics: $ => seq(/m(x|y|z|x2|y2|r|t|cb)?tics/, choice( // p. 190
      field('freq', $._expression),
      'default',
      seq(field('N', $._expression), field('units', choice('seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'))),
    )),

    // nonlinear: $ =>
    //
    // object: $ =>
    //
    // offsets: $ =>
    //
    // origin: $ =>

    output: $ => seq(/o(ut)?(put)?/, field('name', $._expression)),

    overflow: $ => seq('overflow', choice('float', 'NaN', 'undefined')),

    // palette: $ =>

    parametric: $ => 'parametric',

    // paxis: $ =>
    //
    // pixmap: $ =>
    //
    // pm3d: $ =>
    //
    // pointintervalbox: $ =>

    pointsize: $ => seq('pointsize', field('multiplier', $._expression)),

    polar: $ => 'polar',

    // print: $ =>
    //
    // psdir: $ =>
    //
    // range: $ =>
    //
    // raxis: $ =>
    //
    // rgbmax: $ =>

    samples: $ => seq(/sam(ples)?/, $._expression, optional(seq(',', $._expression))),

    size: $ => seq('size', choice(
      choice(/(no)?square/, seq('ratio', $._expression), 'noratio'),
      seq(field('xscale', $._expression), ',', field('yscale', $._expression)),
    )),

    // spiderplot: $ =>

    // style: $ =>

    surface: $ => seq('surface', optional(choice('implicit', 'explicit'))),

    // table: $ =>

    terminal: $ => seq(/ter(m)?(inal)?/, optional(choice($._terminal_type, 'push', 'pop'))),

    _terminal_type: $ => choice(
      $.t_cairolatex,
      // $.t_canvas,
      // $.t_cgm,
      // $.t_context,
      // $.t_domterm,
      // $.t_dumb,
      // $.t_dxf,
      // $.t_emf,
      // $.t_epscairo,
      // $.t_epslatex,
      // $.t_fig,
      // $.t_gif,
      // $.t_hpgl,
      // $.t_jpeg,
      // $.t_lua,
      // $.t_pcl5,
      // $.t_pdfcairo,
      // $.t_png,
      // $.t_pngcairo,
      // $.t_postscript,
      // $.t_pslatex, // pslatex, pstex
      // $.t_pstricks,
      // $.t_qt,
      // $.t_sixelgd,
      // $.t_svg,
      // $.t_tek4xxx, // tek40xx, tek410x
      // $.t_texdraw,
      // $.t_tikz,
      // $.t_tkcanvas,
      // 'unknown',
      // $.t_webp
    ),

    t_cairolatex: $ => seq('cairolatex', optional(seq(
      optional(choice('eps', 'pdf', 'png')),
      optional(choice('standalone', 'input')),
      optional(choice('blacktext', 'colortext', 'colourtext')),
      optional(choice(seq('header', field('header', $._expression)), 'noheader')),
      optional(choice('mono', 'color')),
      /*
      {{no}transparent} {{no}crop} {background <rgbcolor>}
      {font <font>} {fontscale <scale>}
      {linewidth <lw>} {rounded|butt|square} {dashlength <dl>}
      {size <XX>{unit},<YY>{unit}}
      {resolution <dpi>}
      */
    ))),

    // termoption: $ =>

    theta: $ => seq('theta', optional(choice('right', 'top', 'left', 'bottom', 'clockwise', 'cw', 'counterclockwise', 'ccw'))),

    // tics: $ => // p. 222
    //
    // timestamp: $ =>
    //
    // timefmt: $ =>
    //
    // title: $ =>

    version: $ => seq('version', optional('long')),

    // vgrid: $ =>

    // view: $ =>
    //
    // walls: $ =>

    //-------------------------------------------------------------------------
    c_plot: $ => choice(
      seq(
        /p(lot)?/,
        repeat($.range_block),
        $.plot_element,
        repeat(seq(',', $.plot_element)),
      ),
      seq(// TODO: completar p. 244
        /sp(lot)?/,
        repeat($.range_block),
        field('iteration', optional($.for_block)),
        field('func', $.function),
      ),
      seq('replot')
    ),

    plot_element: $ => prec.left(1, seq(
      field('iteration', optional($.for_block)),
      choice(
        seq(field('def', $.def_func), optional($._expression)), // definition WARN: revisar
        seq(/*repeat($.range_block),*/ field('func', $.function)), // BUG: cuando descomento range_block no funciona
        seq(field('data', $._expression), optional($.datafile_modifiers)), // data source
      ),
      repeat(choice(
        seq('axes',/(x1y1|x2y2|x1y2|x2y1)/),
        choice(/not(it)?(tle)?/, seq(/t(it)?(le)?/, $._expression)), // TODO: completar p. 138-139
        seq(/w(ith)?/, $.style, optional($.style_opts)) // TODO: completar p. 139-140
      )),
    )),

    style: $ => choice(/l(ines)?/, /p(oints)?/, /lp|linespoints/, /financebars/,
      /dots/, /i(mpulses)?/, /lab(els)?/, /sur(face)?/, /steps/, /fsteps/, /histeps/,
      /arr(ows)?/, /vec(tors)?/, /(x|y|xy)errorbar/, /(x|y|xy)errorlines/, /parallelaxes/,
      // or
      /boxes/, /boxerrorbars/, /boxxyerror/, /isosurface/, /boxplot/, /candlesticks/,
      /circles/, /zerrorfill/, /ellipses/, /filledcurves/, /fillsteps/, /histograms/,
      /image/, /pm3d/, /rgbalpha/, /rgbimage/, /polygons/,
      // or
      /table/, /mask/
    ),

    style_opts: $ => choice(
      field('ls', seq(/linestyle|ls/, $._expression)),
      repeat1(choice(
        field('lt', seq(/linetype|lt/, $._expression)),
        field('lw', seq(/linewidth|lw/, $._expression)),
        field('lc', seq(/linecolor|lc/, $._expression)),
        field('pt', seq(/pointtype|pt/, $._expression)),
        field('ps', seq(/pointsize|ps/, $._expression)),
        field('as', seq(/arrowstyle|as/, $._expression)),
        field('fs', seq(/fill|fs/, $._expression)),
        field('fc', seq(/fillcolor|fc/, $._expression)),
        'nohidden3d', 'nocontours', 'nosurface', 'palette'
      )),
    ),
    //-------------------------------------------------------------------------
    c_fit: $ => seq( // p. 107
      'fit',
      optional($.range_block),
      field('func', $._expression),
      field('data', $._expression),
      optional($.datafile_modifiers),
      optional(
        repeat1(choice(
          'unitweights',
          /(y|xy|z)err(or)?/,
          seq('errors', $._expression, optional(repeat1(seq(',', $._expression)))),
        )),
      ),
      'via',
      choice(
        field('parameter_file', $._expression),
        field('var', seq($._expression, repeat1(seq(',', $._expression)))),
      ),
    ),

    //-------------------------------------------------------------------------
    // c_stats: $ =>

    //-------------------------------------------------------------------------
    range_block: $ => seq(
      optional(choice(/(x|y|z|r|t|u|v)?ran(ge)?/, seq($.identifier, '='))),
      '[', optional($._expression), ':', optional($._expression), ']'
    ),

    for_block: $ => seq(
      'for', '[',
      choice(
        seq($._expression, 'in', $._expression),
        seq($.def_var, ':', $._expression, optional(seq(':', $._expression))),
      ),
      ']'
    ),

    sum_block: $ => prec.left(2, seq( // p. 53
      'sum', '[', $.identifier, '=', $._expression, ':', $._expression, ']', $._expression
    )),

    datafile_modifiers: $ => repeat1(
      choice(
        field('binary', seq('binary')), // add binary list
        field('matrix', seq(/(nonuniform|sparce)/, 'matrix')),
        field('index', seq(/i(ndex)?/, choice(seq($._expression, optional(seq(':', $._expression)),optional(seq(':',$._expression))), $._expression))),
        field('every', seq('every', $._expression)), // every list WARN: revisar p. 123
        field('skip', seq('skip', field('N_lines', $._expression))),
        field('using', seq(/u(sing)?/, $._expression, repeat(seq(':', $._expression)))), // using list
        seq('smooth', optional($.smooth_options)),
        seq('bins', $._expression), // bins options WARN: revisar p. 125
        'mask',
        'convexhull',
        'volatile',
        'zsort',
        'noautoscale',
      ),
    ),

    line_properties: $ => repeat1(choice(
      field('lt', seq(/linetype|lt/, $._expression)),
      field('lw', seq(/linewidth|lw/, $._expression)),
      field('lc', seq(/linecolor|lc/, $._expression)),
      field('dt', seq(/dashtype|dt/, $._expression)),
    )), // TODO: p. 164

    smooth_options: $ => choice(
      'unique',
      'frequency',
      'fnormal',
      'cumulative',
      'cnormal',
      'csplines',
      'acsplines',
      'mcsplines',
      'path',
      'bezier',
      'sbezier',
      prec.left(1, seq('kdensity', optional(field('bandwidth_period', $._expression)))),
      prec.left(1, seq('convexhull', optional(field('expand', $._expression)))),
      'unwrap'
    ),

    position: $ => seq($._expression, ',', $._expression, optional(seq(',', $._expression))),
    //-------------------------------------------------------------------------
    _assignment: $ => choice(
      $.def_func,
      $.def_var,
      $.def_array,
      // NOTE: me falta algo más?
    ),

    def_func: $ => seq($.function, '=', $._expression), // WARN: revisar la segunda parte

    def_var: $ => seq($.identifier, '=', $._expression),

    def_array: $ => choice(
      seq(
        'array',
        field('name', $.identifier),
        '[', $._expression, ']',
        optional(seq('=','[', $._expression, repeat(seq(',', $._expression)), ']')),
      ),
      seq(
        field('name', $.identifier),
        '[', $._expression, ']','=', $._expression,
      ),
    ),

    _line_continuation: $ => seq('\\', '\n'),

    _line_break: $ => ';', // WARN: revisar nombre y como implementar p. 23

    if_statement: $ => seq(
      'if', '(', $._expression, ')',
      '{', repeat($._statement), '}',
      repeat(seq(
        'else', 'if', '(', repeat1($._expression), ')',
        '{', repeat($._statement), '}',
      )),
      optional(seq('else', '{', repeat($._statement), '}')),
    ),

    do_for_statement: $ => seq(
      'do', $.for_block, '{', repeat($._statement), '}'
    ),

    while_statement: $ => seq(
      'while', '(', $._expression, ')',
      '{', repeat($._statement), '}',
    ),
    //-------------------------------------------------------------------------

    _expression: $ => choice(
      $.identifier,
      $._number,
      $.string_literal,
      // $.macro, // TODO: revisar
      $.function,
      $.sum_block,
      $.unary_expression,
      $.binary_expression,
      $.ternary_expression,
      // NOTE: falta algo?
      // TODO: ver como agregar paréntesis a las expresiones en general
    ),

    function: $ => seq(field('name', $.identifier), '(', field('argument', $._expression), repeat(seq(',', field('argument', $._expression))), ')'),

    _number: $ => choice($.integer, $.float, $.complex),

    integer: $ => /\d+/,

    float: $ =>  /\d+((\.\d+)((e|E)(-|\+)?\d+)?)?/,

    complex: $ => seq('{', choice($.integer, $.float), ',', choice($.integer, $.float), '}'),

    // BUG: revisar la def de string p. 70-71
    string_literal: $ => choice($._single_quoted_string, $._double_quoted_string),

    _single_quoted_string: $ => token(seq("'", repeat(/'[^'\n]'/), "'")),

    _double_quoted_string: $ => token(seq('"', repeat(/"[^"\n]"/), '"')),

    unary_expression: $ => choice(
      prec.left(PREC.UNARY, seq('-', $._expression)),
      prec.left(PREC.UNARY, seq('+', $._expression)),
      prec.left(PREC.BIT_NOT, seq('~', $._expression)),
      prec.left(PREC.UNARY, seq('!', $._expression)),
      prec.left(PREC.POWER, seq($._expression, '!')),
      prec.left(PREC.UNARY, seq('$', $._expression)),
      prec.left(PREC.UNARY, seq('|', $._expression, '|')),
    ),

    binary_expression: $ => choice(
      prec.left(PREC.POWER, seq($._expression, '**', $._expression)),
      prec.left(PREC.TIMES, seq($._expression, '*', $._expression)),
      prec.left(PREC.TIMES, seq($._expression, '/', $._expression)),
      prec.left(PREC.TIMES, seq($._expression, '%', $._expression)),
      prec.left(PREC.PLUS, seq($._expression, '+', $._expression)),
      prec.left(PREC.PLUS, seq($._expression, '-', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, '==', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, '!=', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, '<', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, '<=', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, '>', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, '>=', $._expression)),
      prec.left(PREC.SHIFT, seq($._expression, '>>', $._expression)),
      prec.left(PREC.SHIFT, seq($._expression, '<<', $._expression)),
      prec.left(PREC.BIT_AND, seq($._expression, '&', $._expression)),
      prec.left(PREC.BIT_OR, seq($._expression, '^', $._expression)),
      prec.left(PREC.BIT_OR, seq($._expression, '|', $._expression)),
      prec.left(PREC.AND, seq($._expression, '&&', $._expression)),
      prec.left(PREC.OR, seq($._expression, '||', $._expression)),
      // prec.left(PREC.SHIFT, seq('(', $._expression, ',', $._expression, ')')), // serial evaluation
      prec.left(PREC.CONCAT, seq($._expression, '.', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, 'eq', $._expression)),
      prec.left(PREC.COMPARE, seq($._expression, 'ne', $._expression)),
    ),

    ternary_expression: $ => prec.left(PREC.TERNARY, seq($._expression, '?', $._expression, ':', $._expression)),

    identifier: $ => /\w+/,

    // comment: $ => token(seq('#', /.*/, '\n')),
  }
});
