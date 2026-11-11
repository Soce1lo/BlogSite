import {
  filterExploreItems,
  readExploreFilters,
  writeExploreFilters,
  type ExploreFilters,
  type ExploreIndexItem,
} from "../lib/explore";

function initializeExplore(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>("[data-explore-filters]");
  const list = root.querySelector<HTMLUListElement>("[data-explore-list]");
  const count = root.querySelector<HTMLElement>("[data-explore-count]");
  const empty = root.querySelector<HTMLElement>("[data-explore-empty]");
  const reset = root.querySelector<HTMLButtonElement>("[data-explore-reset]");
  const query = form?.querySelector<HTMLInputElement>('[name="q"]');
  const collection = form?.querySelector<HTMLSelectElement>('[name="collection"]');
  const topic = form?.querySelector<HTMLSelectElement>('[name="topic"]');
  const year = form?.querySelector<HTMLSelectElement>('[name="year"]');
  const sort = form?.querySelector<HTMLSelectElement>('[name="sort"]');

  if (!form || !list || !count || !empty || !reset || !query || !collection || !topic || !year || !sort) {
    return;
  }

  const items = Array.from(list.querySelectorAll<HTMLLIElement>("[data-search-text]"), (element) => {
    const { path, collection, topic, timestamp, year, searchText } = element.dataset;
    return {
      element,
      path: path ?? "",
      collection: collection as ExploreIndexItem["collection"],
      topic: topic ?? "",
      timestamp: Number(timestamp),
      year: year ?? "",
      searchText: searchText ?? "",
    };
  });
  const defaults = readExploreFilters(new URLSearchParams());
  let renderedSort = defaults.sort;
  let editingQuery = false;

  const getFilters = () =>
    readExploreFilters(new URLSearchParams({
      q: query.value,
      collection: collection.value,
      topic: topic.value,
      year: year.value,
      sort: sort.value,
    }));

  const render = (filters: ExploreFilters) => {
    const matches = new Set(filterExploreItems(items, filters));
    if (filters.sort !== renderedSort) {
      const sorted = filterExploreItems(items, { ...defaults, sort: filters.sort });
      list.append(...sorted.map(({ element }) => element));
      renderedSort = filters.sort;
    }
    for (const item of items) {
      item.element.hidden = !matches.has(item);
    }
    list.hidden = matches.size === 0;
    empty.hidden = matches.size > 0;
    const label = matches.size === items.length
      ? `共 ${items.length} 条`
      : `找到 ${matches.size} 条，共 ${items.length} 条`;
    if (count.textContent !== label) count.textContent = label;
  };

  const apply = (fromQuery = false) => {
    const filters = getFilters();
    render(filters);
    const url = new URL(window.location.href);
    writeExploreFilters(url, filters);
    if (url.href === window.location.href) return;

    // Keep one history entry for a typing session, including Chinese IME input.
    if (fromQuery && editingQuery) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
    }
    editingQuery = fromQuery;
  };

  const restoreFromUrl = () => {
    editingQuery = false;
    const filters = readExploreFilters(new URLSearchParams(window.location.search));
    query.value = filters.q;
    collection.value = filters.collection;
    topic.value = filters.topic;
    year.value = filters.year;
    sort.value = filters.sort;
    // A saved link can refer to an option that has since disappeared.
    if (topic.selectedIndex < 0) topic.value = "";
    if (year.selectedIndex < 0) year.value = "";
    render(getFilters());
  };

  query.addEventListener("input", (event) => {
    if (!(event instanceof InputEvent && event.isComposing)) apply(true);
  });
  query.addEventListener("compositionend", () => apply(true));
  query.addEventListener("blur", () => { editingQuery = false; });
  form.addEventListener("change", (event) => {
    if (event.target instanceof HTMLSelectElement) apply();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    apply(true);
    editingQuery = false;
  });
  reset.addEventListener("click", () => {
    form.reset();
    apply();
  });
  window.addEventListener("popstate", restoreFromUrl);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) restoreFromUrl();
  });
  restoreFromUrl();
  form.hidden = false;
}

const explore = document.querySelector<HTMLElement>("[data-explore]");
if (explore) initializeExplore(explore);
