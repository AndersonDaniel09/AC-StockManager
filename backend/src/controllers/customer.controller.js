const customerService = require('../services/customer.service');

async function getAll(req, res) {
  try {
    const customers = await customerService.getAll(req.query.q);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getDeleted(req, res) {
  try {
    const customers = await customerService.getDeleted(req.query.q);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function create(req, res) {
  try {
    const customer = await customerService.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function update(req, res) {
  try {
    const customer = await customerService.update(Number(req.params.id), req.body);
    res.json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function remove(req, res) {
  try {
    const result = await customerService.remove(Number(req.params.id), req.user);
    if (result.pendingApproval) {
      return res.status(202).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function restore(req, res) {
  try {
    const result = await customerService.restore(Number(req.params.id));
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function selfRegister(req, res) {
  try {
    const result = await customerService.selfRegister(req.body);
    if (result.request) {
      return res.status(202).json({
        success: true,
        pendingApproval: true,
        requestCreated: result.requestCreated,
        message: 'Tu solicitud de actualización fue enviada y está pendiente de aprobación.',
      });
    }

    res.status(201).json({ success: true, customer: result.customer });
  } catch (error) {
    if (error.code === 'DUPLICATE') {
      return res.status(409).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
}

async function getPublicDebtByIdNumber(req, res) {
  try {
    const result = await customerService.getPublicDebtByIdNumber(req.params.idNumber);
    res.json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
}

async function getPendingUpdateRequests(req, res) {
  try {
    const requests = await customerService.getPendingUpdateRequests();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function reviewUpdateRequest(req, res) {
  try {
    const request = await customerService.reviewUpdateRequest(Number(req.params.id), req.body, req.user.id);
    res.json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function getPendingDeleteRequests(req, res) {
  try {
    const requests = await customerService.getPendingDeleteRequests();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function reviewDeleteRequest(req, res) {
  try {
    const result = await customerService.reviewDeleteRequest(Number(req.params.id), req.body, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = {
  getAll,
  getDeleted,
  create,
  update,
  remove,
  restore,
  selfRegister,
  getPublicDebtByIdNumber,
  getPendingUpdateRequests,
  reviewUpdateRequest,
  getPendingDeleteRequests,
  reviewDeleteRequest,
};
