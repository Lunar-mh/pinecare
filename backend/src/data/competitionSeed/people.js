'use strict';

const {
  COMMUNITIES,
  FAMILY_RELATIONS,
  SERVICE_TYPES,
  buildName,
  buildPhone,
  isoDate,
  pick,
} = require('./shared');

function buildCommunities() {
  return COMMUNITIES.map((community, index) => ({
    id: community.id,
    name: community.name,
    city: community.city,
    district: community.district,
    address: `${community.city} ${community.district} Care Block ${index + 1}`,
  }));
}

function buildCommunityAdmins() {
  return COMMUNITIES.map((community, index) => ({
    id: 5000 + index + 1,
    role: 'community_admin',
    communityId: community.id,
    name: buildName(index, ' Admin'),
    phone: buildPhone(index + 1, '188'),
    createdAt: isoDate(index, 8, 20),
  }));
}

function buildVolunteers() {
  const volunteers = [];
  let counter = 0;

  COMMUNITIES.forEach((community) => {
    for (let i = 0; i < community.volunteerCount; i += 1) {
      counter += 1;
      volunteers.push({
        id: 6000 + counter,
        role: 'volunteer',
        communityId: community.id,
        name: buildName(counter, ' Volunteer'),
        phone: buildPhone(counter + 50, '137'),
        skillTags: [pick(SERVICE_TYPES, counter), pick(SERVICE_TYPES, counter + 2)],
        createdAt: isoDate(counter % 10, 9, 0),
      });
    }
  });

  return volunteers;
}

function buildEldersAndFamilies() {
  const elders = [];
  const familyMembers = [];
  const bindings = [];
  let elderCounter = 0;
  let familyCounter = 0;
  let bindingCounter = 0;

  COMMUNITIES.forEach((community) => {
    for (let i = 0; i < community.elderCount; i += 1) {
      elderCounter += 1;
      const elderId = 7000 + elderCounter;
      const familyId = 8000 + elderCounter;
      const age = 66 + (elderCounter % 19);
      const relation = pick(FAMILY_RELATIONS, elderCounter);

      elders.push({
        id: elderId,
        role: 'elder',
        communityId: community.id,
        name: buildName(elderCounter, ' Elder'),
        nickname: `elder_${elderCounter}`,
        phone: buildPhone(elderCounter + 100, '136'),
        age,
        gender: elderCounter % 2 === 0 ? 'female' : 'male',
        chronicDiseases: [pick(['hypertension', 'diabetes', 'coronary_heart_disease'], elderCounter)],
        livingStatus: elderCounter % 3 === 0 ? 'living_alone' : 'with_family',
        createdAt: isoDate(elderCounter % 12, 7, 45),
      });

      familyCounter += 1;
      familyMembers.push({
        id: familyId,
        role: 'family',
        communityId: community.id,
        name: buildName(familyCounter, ' Family'),
        phone: buildPhone(familyCounter + 200, '135'),
        relation,
        elderId,
        createdAt: isoDate(familyCounter % 12, 8, 10),
      });

      bindingCounter += 1;
      bindings.push({
        id: bindingCounter,
        elderId,
        familyId,
        communityId: community.id,
        relation,
        status: 'approved',
        isPrimary: true,
        createdAt: isoDate(bindingCounter % 15, 8, 30),
        approvedAt: isoDate(bindingCounter % 15, 9, 0),
      });
    }
  });

  return { elders, familyMembers, bindings };
}

function buildEmergencyContacts(bindings, familyMembers) {
  const familyMap = familyMembers.reduce((map, member) => {
    map[member.id] = member;
    return map;
  }, {});

  return bindings.map((binding, index) => {
    const member = familyMap[binding.familyId];
    return {
      id: 8500 + index + 1,
      userId: binding.elderId,
      name: member ? member.name : `Family Contact ${index + 1}`,
      phone: member ? member.phone : buildPhone(index + 300, '135'),
      relationship: binding.relation,
      isPrimary: true,
      createdAt: binding.createdAt,
      updatedAt: binding.approvedAt,
    };
  });
}

module.exports = {
  buildCommunities,
  buildCommunityAdmins,
  buildVolunteers,
  buildEldersAndFamilies,
  buildEmergencyContacts,
};
