const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const API_URL = 'http://127.0.0.1:5000/api';

async function request(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...options.headers,
        },
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
}

async function runTests() {
    console.log('========================================================');
    console.log('STARTING REDRELAY INVENTORY & NEARBY SEARCH TEST SUITE');
    console.log('========================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`[PASS] ${message}`);
            passed++;
        } else {
            console.error(`[FAIL] ${message}`);
            failed++;
        }
    }

    try {
        // Test 1: Health check
        const health = await request('/health');
        assert(health.ok && health.data.database === 'connected', '1. Backend health & MongoDB connection ready');

        // Test 2: Register Blood Bank
        const testTimestamp = Date.now();
        const bbEmail = `bloodbank_${testTimestamp}@redrelay.org`;
        const bbPassword = 'StrongPassword123!';
        const bbReg = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Dr. Aarav Patel',
                email: bbEmail,
                password: bbPassword,
                role: 'blood_bank',
                facility: 'Nashik Central Blood Bank',
                title: 'Medical Director',
                address: 'Plot 42, Shalimar Circle',
                city: 'Nashik',
                state: 'Maharashtra',
                pinCode: '422001',
                phone: '+91 98230 11223',
                latitude: 20.0059,
                longitude: 73.7898
            })
        });
        assert(bbReg.status === 201 && bbReg.data.success, '2. Blood Bank registration succeeded');

        // Test 3: Blood Bank Login & Token
        const bbLogin = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: bbEmail,
                password: bbPassword,
                role: 'blood_bank'
            })
        });
        assert(bbLogin.ok && bbLogin.data.token, '3. Blood Bank login returned valid JWT token');
        const bbToken = bbLogin.data.token;
        const bbUserId = bbLogin.data.user.id;

        // Test 4: Register Hospital
        const hospEmail = `hospital_${testTimestamp}@redrelay.org`;
        const hospPassword = 'StrongPassword123!';
        const hospReg = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Dr. Priya Sharma',
                email: hospEmail,
                password: hospPassword,
                role: 'hospital',
                facility: 'Apex Trauma & Emergency Hospital',
                title: 'Chief Emergency Surgeon',
                address: 'Gangapur Road',
                city: 'Nashik',
                state: 'Maharashtra',
                pinCode: '422005',
                phone: '+91 98220 44556',
                latitude: 20.0200, // ~2.2 km away from Blood Bank
                longitude: 73.8000
            })
        });
        assert(hospReg.status === 201 && hospReg.data.success, '4. Hospital registration succeeded with real coordinates');

        // Test 5: Hospital Login
        const hospLogin = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: hospEmail,
                password: hospPassword,
                role: 'hospital'
            })
        });
        assert(hospLogin.ok && hospLogin.data.token, '5. Hospital login returned valid JWT token');
        const hospToken = hospLogin.data.token;

        // Test 6: Blood Bank adds valid Blood Stock
        const bagId1 = `BAG-A-${testTimestamp}`;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 30);
        const addStockRes = await request('/inventory', {
            method: 'POST',
            headers: { Authorization: `Bearer ${bbToken}` },
            body: JSON.stringify({
                bloodGroup: 'A+',
                componentType: 'Packed Red Blood Cells',
                units: 15,
                bagId: bagId1,
                collectionDate: new Date().toISOString().split('T')[0],
                expiryDate: tomorrow.toISOString().split('T')[0],
                screeningStatus: 'Approved',
                verificationStatus: 'Verified',
                storageLocation: 'Cold Room Unit 2 - Rack B',
                latitude: 20.0059,
                longitude: 73.7898
            })
        });
        assert(addStockRes.status === 201 && addStockRes.data.success, '6. Blood Bank added A+ Packed Red Blood Cells to MongoDB');
        const stock1Id = addStockRes.data.data._id;

        // Test 7: Prevent duplicate Bag ID
        const dupStockRes = await request('/inventory', {
            method: 'POST',
            headers: { Authorization: `Bearer ${bbToken}` },
            body: JSON.stringify({
                bloodGroup: 'A+',
                componentType: 'Packed Red Blood Cells',
                units: 5,
                bagId: bagId1, // Duplicate!
                collectionDate: new Date().toISOString().split('T')[0],
                expiryDate: tomorrow.toISOString().split('T')[0],
                screeningStatus: 'Approved',
                verificationStatus: 'Verified'
            })
        });
        assert(dupStockRes.status === 409, '7. Duplicate Bag ID correctly rejected with 409 Conflict');

        // Test 8: Blood Bank adds Untested/Pending stock (must be Quarantined)
        const bagId2 = `BAG-PENDING-${testTimestamp}`;
        const addPendingStock = await request('/inventory', {
            method: 'POST',
            headers: { Authorization: `Bearer ${bbToken}` },
            body: JSON.stringify({
                bloodGroup: 'O-',
                componentType: 'Whole Blood',
                units: 10,
                bagId: bagId2,
                collectionDate: new Date().toISOString().split('T')[0],
                expiryDate: tomorrow.toISOString().split('T')[0],
                screeningStatus: 'Pending', // Untested!
                verificationStatus: 'Pending',
                storageLocation: 'Quarantine Bay'
            })
        });
        assert(
            addPendingStock.status === 201 && addPendingStock.data.data.status === 'Quarantined',
            '8. Untested stock automatically quarantined and marked ineligible for transfusion'
        );

        // Test 9: Hospital searches nearby blood (Haversine calculation)
        const searchRes = await request('/inventory/search-nearby', {
            method: 'POST',
            headers: { Authorization: `Bearer ${hospToken}` },
            body: JSON.stringify({
                bloodGroup: 'A+',
                componentType: 'Packed Red Blood Cells',
                units: 4,
                radius: 25,
                latitude: 20.0200,
                longitude: 73.8000
            })
        });
        assert(searchRes.ok && searchRes.data.success, '9. Nearby blood search API executed successfully');
        assert(searchRes.data.count >= 1, '10. Nearby blood search returned matching registered Blood Bank');
        const firstResult = searchRes.data.data[0];
        assert(firstResult.distanceKm > 0 && firstResult.distanceKm < 10, `11. Correct distance calculated via Haversine (${firstResult.distanceKm} km)`);
        assert(firstResult.hasIdenticalMatch === true, '12. Medical compatibility evaluated: Identical Match verified');
        assert(firstResult.totalAvailableUnits >= 4, '13. Sufficient eligible available units verified');

        // Test 10: Untested stock does NOT appear in hospital nearby search
        const searchUntested = await request('/inventory/search-nearby', {
            method: 'POST',
            headers: { Authorization: `Bearer ${hospToken}` },
            body: JSON.stringify({
                bloodGroup: 'O-',
                componentType: 'Whole Blood',
                units: 1,
                radius: 25,
                latitude: 20.0200,
                longitude: 73.8000
            })
        });
        // Since O- was quarantined (screening pending), it must NOT appear as available!
        const oMatches = searchUntested.data?.data?.filter(b => b.batches.some(bt => bt.bagId === bagId2)) || [];
        assert(oMatches.length === 0, '14. Quarantined / untested stock is strictly excluded from hospital available results');

        // Test 11: Hospital creates Blood Request targeting this Blood Bank
        const reqCreateRes = await request('/requests', {
            method: 'POST',
            headers: { Authorization: `Bearer ${hospToken}` },
            body: JSON.stringify({
                bloodGroup: 'A+',
                componentType: 'Packed Red Blood Cells',
                units: 4,
                urgency: 'Critical',
                bloodBankId: bbUserId,
                bloodBankFacility: firstResult.facilityName
            })
        });
        assert(reqCreateRes.status === 201 && reqCreateRes.data.success, '15. Hospital submitted targeted blood request');
        const createdRequestId = reqCreateRes.data.data._id;

        // Test 12: Blood Bank views the incoming request
        const bbRequestsRes = await request('/requests', {
            headers: { Authorization: `Bearer ${bbToken}` }
        });
        const foundRequest = bbRequestsRes.data.data.find(r => r._id === createdRequestId);
        assert(foundRequest && foundRequest.status === 'Pending', '16. Blood Bank dashboard received live pending hospital request');

        // Test 13: Blood Bank accepts request -> atomically reserves and deducts stock in MongoDB
        const acceptRes = await request(`/requests/${createdRequestId}/decision`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${bbToken}` },
            body: JSON.stringify({ decision: 'accept' })
        });
        assert(acceptRes.ok && acceptRes.data.success, '17. Blood Bank accepted request and reserved units');
        assert(acceptRes.data.data.status === 'Accepted', '18. Request status updated to Accepted in MongoDB');

        // Test 14: Verify stock was deducted from MongoDB
        const stockAfterRes = await request('/inventory', {
            headers: { Authorization: `Bearer ${bbToken}` }
        });
        const updatedItem = stockAfterRes.data.data.find(i => i._id === stock1Id);
        assert(updatedItem && updatedItem.units === 11, `19. Atomic deduction verified in MongoDB: 15 - 4 = ${updatedItem?.units} units`);

        // Test 15: Blood Bank dispatches blood
        const dispatchRes = await request(`/requests/${createdRequestId}/dispatch`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${bbToken}` }
        });
        assert(dispatchRes.ok && dispatchRes.data.data.status === 'Dispatched', '20. Blood Bank recorded blood dispatch (status: Dispatched)');

        // Test 16: Hospital confirms delivery
        const deliverRes = await request(`/requests/${createdRequestId}/deliver`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${hospToken}` }
        });
        assert(deliverRes.ok && deliverRes.data.data.status === 'Delivered', '21. Hospital confirmed blood receipt (status: Delivered)');

        // Test 17: Blood Bank quantity update & deactivation
        const qtyUpdate = await request(`/inventory/${stock1Id}/quantity`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${bbToken}` },
            body: JSON.stringify({ units: 20 })
        });
        assert(qtyUpdate.ok && qtyUpdate.data.data.units === 20, '22. Quantity update API verified in MongoDB');

        const deactRes = await request(`/inventory/${stock1Id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${bbToken}` }
        });
        assert(deactRes.ok && deactRes.data.data.isActive === false, '23. Stock deactivation API verified in MongoDB');

        // ========================================================
        // SECTION 2: PYTHON MILP OPTIMIZER END-TO-END TESTS
        // ========================================================
        console.log('\n--- TESTING PYTHON MILP SOLVER INTEGRATION ---');

        // Test 24: Register Second Blood Bank (BB2) for multi-node mesh
        const bb2Email = `bloodbank2_${testTimestamp}@redrelay.org`;
        const bb2Reg = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Dr. Sunita Deshmukh',
                email: bb2Email,
                password: 'StrongPassword123!',
                role: 'blood_bank',
                facility: 'Nashik Metro Blood Depot',
                title: 'Regional Logistics Officer',
                address: 'Ambad Industrial Belt',
                city: 'Nashik',
                state: 'Maharashtra',
                pinCode: '422010',
                phone: '+91 98230 99887',
                latitude: 19.9200, // ~12.2 km away from Hospital
                longitude: 73.7500
            })
        });
        assert(bb2Reg.status === 201 && bb2Reg.data.success, '24. Second Blood Bank (BB2) registered for multi-node mesh');

        const bb2Login = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: bb2Email,
                password: 'StrongPassword123!',
                role: 'blood_bank'
            })
        });
        const bb2Token = bb2Login.data.token;
        const bb2UserId = bb2Login.data.user.id;

        // Test 25: Add stock to BB1 (8 units B+ Platelets, ~1.9 km away)
        const bagOptA = `BAG-OPT-A-${testTimestamp}`;
        const addStockBB1 = await request('/inventory', {
            method: 'POST',
            headers: { Authorization: `Bearer ${bbToken}` },
            body: JSON.stringify({
                bloodGroup: 'B+',
                componentType: 'Platelets',
                units: 8,
                bagId: bagOptA,
                collectionDate: new Date().toISOString().split('T')[0],
                expiryDate: tomorrow.toISOString().split('T')[0],
                screeningStatus: 'Approved',
                verificationStatus: 'Verified',
                storageLocation: 'Platelet Agitator Alpha',
                latitude: 20.0059,
                longitude: 73.7898
            })
        });
        assert(addStockBB1.status === 201, '25. BB1 stocked with 8 units of verified B+ Platelets (~1.9 km away)');
        const stockOptAId = addStockBB1.data.data._id;

        // Test 26: Add stock to BB2 (12 units B+ Platelets, ~12.2 km away)
        const bagOptB = `BAG-OPT-B-${testTimestamp}`;
        const addStockBB2 = await request('/inventory', {
            method: 'POST',
            headers: { Authorization: `Bearer ${bb2Token}` },
            body: JSON.stringify({
                bloodGroup: 'B+',
                componentType: 'Platelets',
                units: 12,
                bagId: bagOptB,
                collectionDate: new Date().toISOString().split('T')[0],
                expiryDate: tomorrow.toISOString().split('T')[0],
                screeningStatus: 'Approved',
                verificationStatus: 'Verified',
                storageLocation: 'Platelet Agitator Beta',
                latitude: 19.9200,
                longitude: 73.7500
            })
        });
        assert(addStockBB2.status === 201, '26. BB2 stocked with 12 units of verified B+ Platelets (~12.2 km away)');
        const stockOptBId = addStockBB2.data.data._id;

        // Test 27: Infeasible Demand test (Request 30 units when only 8 + 12 = 20 exist)
        const infeasibleRes = await request('/requests/optimize', {
            method: 'POST',
            headers: { Authorization: `Bearer ${hospToken}` },
            body: JSON.stringify({
                bloodGroup: 'B+',
                componentType: 'Platelets',
                requiredUnits: 30, // Exceeds 20 available units
                latitude: 20.0200,
                longitude: 73.8000
            })
        });
        assert(
            infeasibleRes.ok && infeasibleRes.data.status === 'Infeasible' && infeasibleRes.data.success === false,
            '27. Infeasible demand correctly detected: returned status Infeasible without errors'
        );
        assert(
            infeasibleRes.data.availableUnits === 20 && infeasibleRes.data.requiredUnits === 30,
            '28. Infeasible response correctly reports network available units (20) vs required (30)'
        );

        // Test 28: Verify inventory is UNCHANGED after infeasible optimization
        const checkStockBB1 = await request('/inventory', { headers: { Authorization: `Bearer ${bbToken}` } });
        const itemA = checkStockBB1.data.data.find(i => i._id === stockOptAId);
        assert(itemA && itemA.units === 8, '29. Inventory safe: BB1 stock remains exactly 8 units after solver run');

        // Test 29: Feasible Demand test (Request 14 units - must allocate from closest BB1 first)
        const optimizeRes = await request('/requests/optimize', {
            method: 'POST',
            headers: { Authorization: `Bearer ${hospToken}` },
            body: JSON.stringify({
                bloodGroup: 'B+',
                componentType: 'Platelets',
                requiredUnits: 14,
                latitude: 20.0200,
                longitude: 73.8000
            })
        });
        assert(optimizeRes.ok && optimizeRes.data.status === 'Optimal' && optimizeRes.data.success === true, '30. Python MILP Solver returned Optimal solution status');
        assert(optimizeRes.data.totalAllocated === 14, '31. Total units allocated matches requested demand (14 units)');
        assert(optimizeRes.data.transfers.length === 2, '32. Redistribution mesh allocated supply across both blood banks');

        const transferBB1 = optimizeRes.data.transfers.find(t => t.bloodBankId === bbUserId);
        const transferBB2 = optimizeRes.data.transfers.find(t => t.bloodBankId === bb2UserId);
        assert(
            transferBB1 && transferBB1.units === 8,
            `33. PuLP Distance Minimization: Nearest depot (BB1, ${transferBB1?.distanceKm} km) exhausted first (8 units allocated)`
        );
        assert(
            transferBB2 && transferBB2.units === 6,
            `34. PuLP Distance Minimization: Remaining demand (6 units) drawn from second depot (BB2, ${transferBB2?.distanceKm} km)`
        );
        assert(
            optimizeRes.data.totalRoutingCost > 0 && typeof optimizeRes.data.totalRoutingCost === 'number',
            `35. Distance-weighted objective cost calculated: ${optimizeRes.data.totalRoutingCost}`
        );

        // Test 30: Verify inventory is STILL UNCHANGED before explicit confirmation
        const preConfirmStockBB1 = await request('/inventory', { headers: { Authorization: `Bearer ${bbToken}` } });
        const preConfirmA = preConfirmStockBB1.data.data.find(i => i._id === stockOptAId);
        assert(preConfirmA && preConfirmA.units === 8, '36. Safety Guarantee: Inventory remains unchanged before explicit confirmation');

        // Test 31: Hospital explicitly confirms the transfer manifest
        const confirmRes = await request('/requests/confirm-manifest', {
            method: 'POST',
            headers: { Authorization: `Bearer ${hospToken}` },
            body: JSON.stringify({
                manifestId: optimizeRes.data.manifestId,
                bloodGroup: 'B+',
                componentType: 'Platelets',
                requiredUnits: 14,
                urgency: 'Critical',
                transfers: optimizeRes.data.transfers
            })
        });
        assert(confirmRes.status === 201 && confirmRes.data.success === true, '37. Manifest confirmed: transfer orders created with 201 Created');
        assert(confirmRes.data.confirmedRequests.length === 2, '38. Persistent Accepted requests created for both supplying depots');

        // Test 32: Verify stock was atomically deducted across both blood banks
        const postConfirmBB1 = await request('/inventory', { headers: { Authorization: `Bearer ${bbToken}` } });
        const postA = postConfirmBB1.data.data.find(i => i._id === stockOptAId);
        assert(postA && postA.units === 0, `39. Atomic deduction verified at BB1: 8 - 8 = ${postA?.units} units remaining`);

        const postConfirmBB2 = await request('/inventory', { headers: { Authorization: `Bearer ${bb2Token}` } });
        const postB = postConfirmBB2.data.data.find(i => i._id === stockOptBId);
        assert(postB && postB.units === 6, `40. Atomic deduction verified at BB2: 12 - 6 = ${postB?.units} units remaining`);

        // Test 33: Duplicate Confirmation / Over-allocation prevention
        const dupConfirmRes = await request('/requests/confirm-manifest', {
            method: 'POST',
            headers: { Authorization: `Bearer ${hospToken}` },
            body: JSON.stringify({
                manifestId: optimizeRes.data.manifestId,
                bloodGroup: 'B+',
                componentType: 'Platelets',
                requiredUnits: 14,
                transfers: optimizeRes.data.transfers
            })
        });
        assert(dupConfirmRes.status === 409, '41. Duplicate manifest confirmation rejected with 409 Conflict (stock already reserved)');

        // Summary
        console.log('\n========================================================');
        console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log('========================================================\n');

        if (failed > 0) process.exit(1);
        process.exit(0);
    } catch (e) {
        console.error('Test execution crashed:', e);
        process.exit(1);
    }
}

runTests();
