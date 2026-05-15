(function () {
  'use strict';

  var index = Array.isArray(window.STATIC_SEARCH_INDEX) ? window.STATIC_SEARCH_INDEX : [];
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  var rootPath = script && script.getAttribute('data-doc-root') ? script.getAttribute('data-doc-root') : './';
  var docRoot = new URL(rootPath, window.location.href);
  var resultLimit = 20;

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getTerms(query) {
    var normalized = normalize(query);
    if (!normalized) {
      return [];
    }
    var parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts;
    }
    parts.unshift(normalized);
    return parts;
  }

  function countMatches(text, term) {
    var count = 0;
    var at = text.indexOf(term);
    while (at !== -1) {
      count += 1;
      at = text.indexOf(term, at + term.length);
    }
    return count;
  }

  function scoreItem(item, terms, fullQuery) {
    var title = normalize(item.title);
    var category = normalize(item.category);
    var text = normalize(item.text);
    var score = 0;

    if (title.indexOf(fullQuery) !== -1) {
      score += 60;
    }
    if (category.indexOf(fullQuery) !== -1) {
      score += 25;
    }
    if (text.indexOf(fullQuery) !== -1) {
      score += 15;
    }

    terms.forEach(function (term) {
      if (!term) {
        return;
      }
      if (title.indexOf(term) !== -1) {
        score += 35;
      }
      if (category.indexOf(term) !== -1) {
        score += 12;
      }
      var matches = countMatches(text, term);
      if (matches) {
        score += Math.min(matches, 12);
      }
    });

    return score;
  }

  function makeExcerpt(item, terms) {
    var source = item.text || item.excerpt || '';
    var normalized = normalize(source);
    var firstAt = -1;
    terms.some(function (term) {
      firstAt = normalized.indexOf(term);
      return firstAt !== -1;
    });

    if (firstAt === -1) {
      return (item.excerpt || source).slice(0, 150);
    }

    var start = Math.max(0, firstAt - 45);
    var excerpt = source.slice(start, start + 170);
    return (start > 0 ? '...' : '') + excerpt + (start + 170 < source.length ? '...' : '');
  }

  function search(query) {
    var fullQuery = normalize(query);
    var terms = getTerms(query);
    if (!fullQuery || !terms.length) {
      return [];
    }

    return index
      .map(function (item) {
        return {
          item: item,
          score: scoreItem(item, terms, fullQuery)
        };
      })
      .filter(function (entry) {
        return entry.score > 0;
      })
      .sort(function (a, b) {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return String(a.item.title || '').localeCompare(String(b.item.title || ''), 'zh-Hant');
      })
      .slice(0, resultLimit);
  }

  function resultUrl(item) {
    return new URL(item.url, docRoot).href;
  }

  function render(container, query) {
    var trimmed = String(query || '').trim();
    if (!trimmed) {
      container.innerHTML = '';
      container.hidden = true;
      return;
    }

    var terms = getTerms(trimmed);
    var results = search(trimmed);
    var html = '<div class="static-search-panel">';
    html += '<div class="static-search-summary">搜尋結果：' + escapeHtml(trimmed) + '（' + results.length + '）</div>';

    if (!results.length) {
      html += '<div class="static-search-empty">找不到符合的內容</div>';
    } else {
      html += '<ol class="static-search-list">';
      results.forEach(function (entry) {
        var item = entry.item;
        html += '<li class="static-search-item">';
        html += '<a class="static-search-title" href="' + escapeHtml(resultUrl(item)) + '">' + escapeHtml(item.title) + '</a>';
        if (item.category) {
          html += '<div class="static-search-category">' + escapeHtml(item.category) + '</div>';
        }
        html += '<p class="static-search-excerpt">' + escapeHtml(makeExcerpt(item, terms)) + '</p>';
        html += '</li>';
      });
      html += '</ol>';
    }

    html += '</div>';
    container.innerHTML = html;
    container.hidden = false;
  }

  function ensureStyles() {
    if (document.getElementById('static-search-styles')) {
      return;
    }
    var style = document.createElement('style');
    style.id = 'static-search-styles';
    style.textContent = [
      '.hkb-site-search__loader{display:none!important;}',
      '.static-search-results{margin:18px auto 0;max-width:820px;text-align:left;}',
      '.static-search-panel{background:#fff;border:1px solid #dfe5e8;border-radius:4px;box-shadow:0 8px 22px rgba(0,0,0,.16);color:#24313a;overflow:hidden;}',
      '.static-search-summary{font-weight:700;padding:14px 18px;border-bottom:1px solid #e8eef1;}',
      '.static-search-empty{padding:18px;}',
      '.static-search-list{list-style:none;margin:0;padding:0;}',
      '.static-search-item{margin:0;padding:15px 18px;border-bottom:1px solid #edf1f3;}',
      '.static-search-item:last-child{border-bottom:0;}',
      '.static-search-title{display:block;font-size:18px;font-weight:700;line-height:1.35;text-decoration:none;}',
      '.static-search-category{font-size:13px;color:#60707b;margin-top:4px;}',
      '.static-search-excerpt{font-size:14px;line-height:1.55;margin:7px 0 0;color:#40515d;}',
      '@media (max-width:640px){.static-search-results{margin-top:12px}.static-search-title{font-size:16px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function setupForm(form) {
    var input = form.querySelector('.hkb-site-search__field, input[name="s"]');
    if (!input) {
      return;
    }
    var container = document.createElement('div');
    container.className = 'static-search-results';
    container.hidden = true;
    form.insertAdjacentElement('afterend', container);

    var timer = null;
    function runSearch(value, updateUrl) {
      render(container, value);
      if (updateUrl && window.history && window.history.replaceState) {
        try {
          var url = new URL(window.location.href);
          if (String(value || '').trim()) {
            url.searchParams.set('s', value);
          } else {
            url.searchParams.delete('s');
          }
          url.searchParams.delete('ht-kb-search');
          window.history.replaceState(null, '', url.href);
        } catch (error) {
          // Some older browsers restrict file:// history updates. Search still works.
        }
      }
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      runSearch(input.value, true);
    });

    input.addEventListener('input', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        runSearch(input.value, false);
      }, 140);
    });

    var params = new URLSearchParams(window.location.search);
    var query = params.get('s') || params.get('q') || '';
    if (query) {
      input.value = query;
      runSearch(query, false);
    }
  }

  function init() {
    ensureStyles();
    var forms = document.querySelectorAll('.hkb-site-search');
    Array.prototype.forEach.call(forms, setupForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
