import axios from './cached-axios';
import cookie from 'react-cookies';
import { idToTags } from '../data/id_tags.js';
import { TAG_CLASSIFY } from '../data/tag_classify.js';

const API_BASE_URL = 'https://api.bgm.tv';

function getLoginInfo() {
  const access_token = cookie.load('access_token')
  const user_id = cookie.load('user_id')
  if (access_token && user_id) {
    return {
      access_token: access_token,
      user_id: user_id,
    }
  }
  return null
}

function enableAuthorizedSearch(isEnable, access_token) {
  if (isEnable && access_token) {
    axios.axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
  } else {
    axios.axios.defaults.headers.common['Authorization'] = null
  }
}

async function getSubjectDetails(subjectId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/v0/subjects/${subjectId}`);

    if (!response.data) {
      throw new Error('No subject details found');
    }
    // Get air date and current date
    const airDate = response.data.date;
    const currentDate = new Date();

    // If air date is in the future, return null to indicate this show should be ignored
    if (airDate && new Date(airDate) > currentDate) {
      return null;
    }

    let year = airDate ? parseInt(airDate.split('-')[0]) : null;

    // Extract meta tags and add animation studios
    // const persons = [];
    // const animationStudio = response.data.infobox?.find(item => item.key === '动画制作')?.value;
    // if (animationStudio && animationStudio.length < 50) {
    //   // Split by both '×' and '/' and trim whitespace from each studio
    //   const studioSplit = animationStudio.split(/[×/()、（）\[\]]/).map(studio => studio.trim()).filter(studio => studio.length < 30 && studio.length > 0);
    //   persons.push(...studioSplit);
    // }

    // const publisher = response.data.infobox?.find(item => item.key === '发行')?.value;
    // if (publisher && publisher.length < 50) {
    //   const studioTrim = publisher.split(/[×/()、（）\[\]]/)[0].trim();
    //   persons.push(studioTrim);
    // }

    // console.log(response.data)

    // const tags = [];
    // if (response.data.type === 2) {
    //   response.data.tags
    //     .filter(tag => !tag.name.match(/^\d{4}$/))
    //     .forEach(tag => tags.push({ [tag.name]: tag.count }));
    // }
    // if (response.data.type === 4) {
    //   response.data.tags
    //     .filter(tag => !tag.name.match(/^\d{4}$/))
    //     .forEach(tag => tags.push({ [tag.name]: tag.count }));
    // }

    return {
      name: response.data.name_cn || response.data.name,
      year,
      tags: response.data.tags,
      meta_tags: response.data.meta_tags,
      rating: response.data.rating?.score || 0,
      rating_count: response.data.rating?.total || 0
    };
  } catch (error) {
    console.error('Error fetching subject details:', error);
    throw error;
  }
}

async function getCharacterAppearances(characterId, gameSettings) {
  try {
    const [subjectsResponse, personsResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/v0/characters/${characterId}/subjects`),
      axios.get(`${API_BASE_URL}/v0/characters/${characterId}/persons`)
    ]);

    if (!subjectsResponse.data || !subjectsResponse.data.length) {
      return {
        appearances: [],
        latestAppearance: -1,
        earliestAppearance: -1,
        highestRating: 0,
        metaTags: {}
      };
    }

    let filteredAppearances;
    if (gameSettings.includeGame || gameSettings.subjectType.length === 2) {
      filteredAppearances = subjectsResponse.data.filter(appearance =>
        (appearance.staff === '主角' || appearance.staff === '配角')
        && (appearance.type === 2 || appearance.type === 4)
      );
    } else {
      filteredAppearances = subjectsResponse.data.filter(appearance =>
        (appearance.staff === '主角' || appearance.staff === '配角')
        && (appearance.type === gameSettings.subjectType[0])
      );
    }

    if (filteredAppearances.length === 0) {
      return {
        appearances: [],
        latestAppearance: -1,
        earliestAppearance: -1,
        highestRating: -1,
        metaTags: {}
      };
    }

    let latestAppearance = -1;
    let earliestAppearance = -1;
    let highestRating = -1;
    const subjectTagsCount = new Map(); // Track cumulative counts for each tag
    let allMetaTags = new Set();

    const allTags = {
      platform: [],
      region: [],
      source: [],
      category: [],
      genre: [],
      meta_tags: [],
      subject_tags: [],
      character_tags: [],
      cv_tags: [],
      added_tags: [],
    }

    // Get just the names and collect meta tags
    const appearances = await Promise.all(
      filteredAppearances.map(async appearance => {
        try {
          const details = await getSubjectDetails(appearance.id);

          if (!details || details.year === null) return null;

          if (!gameSettings.metaTags.filter(tag => tag !== '').every(tag => details.meta_tags.includes(tag))) {
            return null;
          }

          if (latestAppearance === -1 || details.year > latestAppearance) {
            latestAppearance = details.year;
          }
          if (earliestAppearance === -1 || details.year < earliestAppearance) {
            earliestAppearance = details.year;
          }
          if (details.rating > highestRating) {
            highestRating = details.rating;
          }

          // Merge tag counts
          details.tags.forEach(tag => {
            const { name, count } = tag;
            subjectTagsCount.set(name, (subjectTagsCount.get(name) || 0) + count);
          });

          details.meta_tags.forEach(metaTag => allMetaTags.add(metaTag))

          return {
            name: details.name,
            rating_count: details.rating_count
          };
        } catch (error) {
          console.error(`Failed to get details for subject ${appearance.id}:`, error);
          return null;
        }
      })
    );

    // Convert tagCounts to array of objects and sort by count
    let sortedSubjectTags = Array.from(subjectTagsCount)
      .filter(([name, count]) => count >= 10)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => name)

    const characterTags = []
    if (idToTags && idToTags[characterId]) {
      idToTags[characterId].forEach(tag => characterTags.push(tag));
    }

    // Add at most subjectTagNum tags from sortedTags
    // let addedTagCount = 0;
    // for (const tagObj of sortedTags) {
    //   if (addedTagCount >= gameSettings.subjectTagNum) break;
    //   const tagName = Object.keys(tagObj)[0];
    //   allMetaTags.add(tagName);
    //   addedTagCount++;
    // }

    const validAppearances = appearances
      .filter(appearance => appearance !== null)
      .sort((a, b) => b.rating_count - a.rating_count)
      .map(appearance => appearance.name);

    const cvTags = new Set()
    if (characterId === 56822 || characterId === 56823 || characterId === 17529 || characterId === 10956) {
      personsResponse.data = [];
      allTags.added_tags.push('展开');
    } else if (personsResponse.data && personsResponse.data.length) {
      const animeVAs = personsResponse.data.filter(person => person.subject_type === 2 || person.subject_type === 4);
      animeVAs.forEach(person => {
        cvTags.add(person.name);
      });
    }

    let sortedMetaTags = new Set(sortedSubjectTags.filter(tag => allMetaTags.has(tag)))
    sortedMetaTags = [
      ...sortedMetaTags,
      ...Array.from(allMetaTags).filter(tag => !sortedMetaTags.has(tag)) // meta tags with no count data
    ]

    sortedSubjectTags = sortedSubjectTags
      .filter(tag => !tag.match(/\d{4}/)) // remove year tags
      .filter(tag => !allMetaTags.has(tag)) // remove meta tags
      .filter(tag => !cvTags.has(tag)) // remove cv tags
      .filter(tag => !characterTags.includes(tag)) // remove character tags

    // Combine tags of different types together
    allTags.meta_tags.push(...sortedMetaTags)
    allTags.subject_tags.push(...sortedSubjectTags)
    allTags.character_tags.push(...characterTags)
    allTags.cv_tags.push(...cvTags)

    // Move special types of meta tags to separate types
    // For Anime
    if (gameSettings.subjectType.length === 1 && gameSettings.subjectType[0] === 2) {
      allTags.meta_tags = allTags.meta_tags.map(tag => {
        if (TAG_CLASSIFY.anime.platform.includes(tag)) {
          allTags.platform.push(tag)
          return null
        }
        if (TAG_CLASSIFY.anime.region.includes(tag)) {
          allTags.region.push(tag)
          return null
        }
        if (TAG_CLASSIFY.anime.source.includes(tag)) {
          allTags.source.push(tag)
          return null
        }
        if (TAG_CLASSIFY.anime.genre.includes(tag)) {
          allTags.genre.push(tag)
          return null
        }
        return tag
      }).filter(tag => tag)
    }

    // For Game
    if (gameSettings.subjectType.length === 1 && gameSettings.subjectType[0] === 4) {
      allTags.meta_tags = allTags.meta_tags.map(tag => {
        if (TAG_CLASSIFY.game.platform.includes(tag)) {
          allTags.platform.push(tag)
          return null
        }
        if (TAG_CLASSIFY.game.category.includes(tag)) {
          allTags.category.push(tag)
          return null
        }
        return tag
      }).filter(tag => tag)

      // For Galgame
      if (gameSettings.metaTags[3] === "Galgame") {
        allTags.subject_tags = allTags.subject_tags.map(tag => {
          if (TAG_CLASSIFY.galgame.genre.includes(tag)) {
            allTags.genre.push(tag)
            return null
          }
          return tag
        }).filter(tag => tag)
      }
    }

    return {
      appearances: validAppearances,
      latestAppearance,
      earliestAppearance,
      highestRating,
      metaTags: allTags
    };
  } catch (error) {
    console.error('Error fetching character appearances:', error);
    return {
      appearances: [],
      latestAppearance: -1,
      earliestAppearance: -1,
      highestRating: -1,
      metaTags: {}
    };
  }
}

async function getCharacterDetails(characterId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/v0/characters/${characterId}`);

    if (!response.data) {
      throw new Error('No character details found');
    }

    // Extract Chinese name from infobox
    const nameCn = response.data.infobox?.find(item => item.key === '简体中文名')?.value || null;

    // Handle gender - only accept string values of 'male' or 'female'
    const gender = typeof response.data.gender === 'string' &&
      (response.data.gender === 'male' || response.data.gender === 'female')
      ? response.data.gender
      : '?';

    return {
      nameCn: nameCn,
      gender,
      image: response.data.images.medium,
      summary: response.data.summary,
      popularity: response.data.stat.collects
    };
  } catch (error) {
    console.error('Error fetching character details:', error);
    throw error;
  }
}

async function getCharactersBySubjectId(subjectId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/v0/subjects/${subjectId}/characters`);

    if (!response.data || !response.data.length) {
      throw new Error('No characters found for this anime');
    }

    const filteredCharacters = response.data.filter(character =>
      character.relation === '主角' || character.relation === '配角'
    );

    if (filteredCharacters.length === 0) {
      throw new Error('No main or supporting characters found for this anime');
    }

    return filteredCharacters;
  } catch (error) {
    console.error('Error fetching characters:', error);
    throw error;
  }
}

async function getRandomCharacter(gameSettings) {
  try {
    let subject;
    let total;
    let randomOffset;

    if (gameSettings.useIndex && gameSettings.indexId) {
      // Get index info first
      const indexInfo = await getIndexInfo(gameSettings.indexId);
      // Get total from index info
      total = indexInfo.total + gameSettings.addedSubjects.length;

      // Get a random offset within the total number of subjects
      randomOffset = Math.floor(Math.random() * total);

      if (randomOffset >= indexInfo.total) {
        randomOffset = randomOffset - indexInfo.total;
        subject = gameSettings.addedSubjects[randomOffset];
      } else {
        // Fetch one subject from the index at the random offset
        const response = await axios.get(
          `${API_BASE_URL}/v0/indices/${gameSettings.indexId}/subjects?limit=1&offset=${randomOffset}`
        );

        if (!response.data || !response.data.data || response.data.data.length === 0) {
          throw new Error('No subjects found in index');
        }

        subject = response.data.data[0];
      }
    } else {
      gameSettings.useIndex = false;
      total = gameSettings.topNSubjects + gameSettings.addedSubjects.length;

      randomOffset = Math.floor(Math.random() * total);
      const endDate = new Date(`${gameSettings.endYear + 1}-01-01`);
      const today = new Date();
      const minDate = new Date(Math.min(endDate.getTime(), today.getTime())).toISOString().split('T')[0];

      if (randomOffset >= gameSettings.topNSubjects) {
        randomOffset = randomOffset - gameSettings.topNSubjects;
        subject = gameSettings.addedSubjects[randomOffset];
      } else {
        // Fetch one subject at the random offset
        const validMetaTags = []
        if (gameSettings.subjectType.indexOf(2) !== -1) validMetaTags.push(...gameSettings.metaTags.slice(0, 3));
        if (gameSettings.subjectType.indexOf(4) !== -1) validMetaTags.push(...gameSettings.metaTags.slice(3, 6));

        // const access_token = cookie.load('access_token')
        // if (access_token) axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

        const response = await axios.post(`${API_BASE_URL}/v0/search/subjects?limit=1&offset=${randomOffset}`, {
          "sort": "heat",
          "filter": {
            "type": gameSettings.subjectType,
            "air_date": [
              `>=${gameSettings.startYear}-01-01`,
              `<${minDate}`
            ],
            "meta_tags": validMetaTags.filter(tag => tag !== "")
          }
        });

        if (!response.data || !response.data.data || response.data.data.length === 0) {
          throw new Error('Failed to fetch subject at random offset');
        }

        subject = response.data.data[0];
      }
    }

    // Get characters for the selected subject
    const characters = await getCharactersBySubjectId(subject.id);

    // Filter and select characters based on mainCharacterOnly setting
    const filteredCharacters = gameSettings.mainCharacterOnly
      ? characters.filter(character => character.relation === '主角')
      : characters.filter(character => character.relation === '主角' || character.relation === '配角').slice(0, gameSettings.characterNum);

    if (filteredCharacters.length === 0) {
      throw new Error('No characters found for this anime');
    }

    // Randomly select one character from the filtered characters
    const selectedCharacter = filteredCharacters[Math.floor(Math.random() * filteredCharacters.length)];

    // Get additional character details
    const characterDetails = await getCharacterDetails(selectedCharacter.id);

    // Get character appearances
    const appearances = await getCharacterAppearances(selectedCharacter.id, gameSettings);

    return {
      ...selectedCharacter,
      ...characterDetails,
      ...appearances
    };
  } catch (error) {
    console.error('Error getting random character:', error);
    throw error;
  }
}

function generateFeedback(guess, answerCharacter) {
  const result = {};

  result.gender = {
    guess: guess.gender,
    feedback: guess.gender === answerCharacter.gender ? 'yes' : 'no'
  };

  const popularityDiff = guess.popularity - answerCharacter.popularity;
  const fivePercent = answerCharacter.popularity * 0.05;
  const twentyPercent = answerCharacter.popularity * 0.2;
  let popularityFeedback;
  if (Math.abs(popularityDiff) <= fivePercent) {
    popularityFeedback = '=';
  } else if (popularityDiff > 0) {
    popularityFeedback = popularityDiff <= twentyPercent ? '+' : '++';
  } else {
    popularityFeedback = popularityDiff >= -twentyPercent ? '-' : '--';
  }
  result.popularity = {
    guess: guess.popularity,
    feedback: popularityFeedback
  };

  // Handle rating comparison
  const ratingDiff = guess.highestRating - answerCharacter.highestRating;
  const ratingFivePercent = answerCharacter.highestRating * 0.02;
  const ratingTwentyPercent = answerCharacter.highestRating * 0.1;
  let ratingFeedback;
  if (guess.highestRating === -1 || answerCharacter.highestRating === -1) {
    ratingFeedback = '?';
  } else if (Math.abs(ratingDiff) <= ratingFivePercent) {
    ratingFeedback = '=';
  } else if (ratingDiff > 0) {
    ratingFeedback = ratingDiff <= ratingTwentyPercent ? '+' : '++';
  } else {
    ratingFeedback = ratingDiff >= -ratingTwentyPercent ? '-' : '--';
  }
  result.rating = {
    guess: guess.highestRating,
    feedback: ratingFeedback
  };

  const sharedAppearances = guess.appearances.filter(appearance => answerCharacter.appearances.includes(appearance));
  result.shared_appearances = {
    first: sharedAppearances[0] || '',
    count: sharedAppearances.length
  };

  // Compare total number of appearances
  const appearanceDiff = guess.appearances.length - answerCharacter.appearances.length;
  const twentyPercentAppearances = answerCharacter.appearances.length * 0.2;
  let appearancesFeedback;
  if (appearanceDiff === 0) {
    appearancesFeedback = '=';
  } else if (appearanceDiff > 0) {
    appearancesFeedback = appearanceDiff <= twentyPercentAppearances ? '+' : '++';
  } else {
    appearancesFeedback = appearanceDiff >= -twentyPercentAppearances ? '-' : '--';
  }
  result.appearancesCount = {
    guess: guess.appearances.length,
    feedback: appearancesFeedback
  };

  // Advice from EST-NINE
  const answerMetaTagsSet = new Set(getAllTags(answerCharacter.metaTags));
  let sharedMetaTags = {}
  for (const [tag_type, tags] of Object.entries(guess.metaTags)) {
    sharedMetaTags[tag_type] = tags.filter(tag => answerMetaTagsSet.has(tag));
  }
  const sharedCVs = guess.metaTags.cv_tags.filter(tag => answerCharacter.metaTags.cv_tags.includes(tag));

  result.metaTags = {
    guess: getAllTags(guess.metaTags),
    shared: sharedMetaTags,
    sharedCVs: sharedCVs
  };

  if (guess.latestAppearance === -1 || answerCharacter.latestAppearance === -1) {
    result.latestAppearance = {
      guess: guess.latestAppearance === -1 ? '?' : guess.latestAppearance,
      feedback: guess.latestAppearance === -1 && answerCharacter.latestAppearance === -1 ? '=' : '?'
    };
  } else {
    const yearDiff = guess.latestAppearance - answerCharacter.latestAppearance;
    let yearFeedback;
    if (yearDiff === 0) {
      yearFeedback = '=';
    } else if (yearDiff > 0) {
      yearFeedback = yearDiff <= 1 ? '+' : '++';
    } else {
      yearFeedback = yearDiff >= -1 ? '-' : '--';
    }
    result.latestAppearance = {
      guess: guess.latestAppearance,
      feedback: yearFeedback
    };
  }

  if (guess.earliestAppearance === -1 || answerCharacter.earliestAppearance === -1) {
    result.earliestAppearance = {
      guess: guess.earliestAppearance,
      feedback: guess.earliestAppearance === -1 && answerCharacter.earliestAppearance === -1 ? '=' : '?'
    };
  } else {
    const yearDiff = guess.earliestAppearance - answerCharacter.earliestAppearance;
    let yearFeedback;
    if (yearDiff === 0) {
      yearFeedback = '=';
    } else if (yearDiff > 0) {
      yearFeedback = yearDiff <= 1 ? '+' : '++';
    } else {
      yearFeedback = yearDiff >= -1 ? '-' : '--';
    }
    result.earliestAppearance = {
      guess: guess.earliestAppearance,
      feedback: yearFeedback
    };
  }

  return result;
}

async function getIndexInfo(indexId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/v0/indices/${indexId}`);

    if (!response.data) {
      throw new Error('No index information found');
    }

    return {
      title: response.data.title,
      total: response.data.total
    };
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Index not found');
    }
    console.error('Error fetching index information:', error);
    throw error;
  }
}

async function searchSubjects(keyword) {
  try {
    const response = await axios.post(`${API_BASE_URL}/v0/search/subjects`, {
      keyword: keyword.trim(),
      filter: {
        // type: [2]  // Only anime
        type: [2, 4]  // anime and game
      }
    });

    if (!response.data || !response.data.data) {
      return [];
    }

    return response.data.data.map(subject => ({
      id: subject.id,
      name: subject.name,
      name_cn: subject.name_cn,
      image: subject.images?.grid || subject.images?.medium || '',
      date: subject.date,
      type: subject.type == 2 ? '动漫' : '游戏'
    }));
  } catch (error) {
    console.error('Error searching subjects:', error);
    return [];
  }
}

function getAllTags(allTags) {
  const {
    platform,
    region,
    source,
    category,
    genre,
    meta_tags,
    subject_tags,
    character_tags,
    cv_tags,
    added_tags,
  } = allTags

  return [
    ...platform,
    ...region,
    ...source,
    ...category,
    ...genre,
    ...meta_tags,
    ...subject_tags,
    ...character_tags,
    ...cv_tags,
    ...added_tags
  ]
}

function getShortTags(allTags, gameSettings) {
  let {
    platform,
    region,
    source,
    category,
    genre,
    meta_tags,
    subject_tags,
    character_tags,
    cv_tags,
    added_tags,
  } = allTags

  if (gameSettings.subjectType.length === 1 && gameSettings.subjectType[0] === 2) {
    platform = platform.slice(0, Math.min(1, platform.length))
    region = region.slice(0, Math.min(1, region.length))
    source = source.slice(0, Math.min(1, source.length))
    // genre = genre.slice(0, Math.min(1, genre.length))
    meta_tags = []
  } else if (gameSettings.subjectType.length === 1 && gameSettings.subjectType[0] === 4) {
    platform = platform.slice(0, Math.min(1, platform.length))
    category = category.slice(0, Math.min(1, category.length))
    // genre = genre.slice(0, Math.min(1, genre.length))
    meta_tags = meta_tags.filter(tag => tag != "游戏").slice(0, Math.min(4, meta_tags.length))
  } else {
    meta_tags = meta_tags.slice(0, Math.min(6, meta_tags.length))
  }

  subject_tags = subject_tags.slice(0, Math.min(gameSettings.subjectTagNum, subject_tags.length))
  character_tags = character_tags.slice(0, Math.min(gameSettings.characterTagNum, character_tags.length))

  return [
    ...platform,
    ...region,
    ...source,
    ...category,
    ...genre,
    ...meta_tags,
    ...subject_tags,
    ...character_tags,
    // ...cv_tags, // special check for cv
    ...added_tags
  ]
}

export {
  getLoginInfo,
  getRandomCharacter,
  getCharacterAppearances,
  getCharactersBySubjectId,
  getCharacterDetails,
  generateFeedback,
  getIndexInfo,
  searchSubjects,
  enableAuthorizedSearch,
  getAllTags,
  getShortTags,
}; 